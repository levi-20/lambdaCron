/** @format */
// command : npm run test --silent false --colors
import { describe } from '@jest/globals';
import { BEFORE_PACKAGE_HOOK, CrontType } from './index';
import LambdaCronJobs from './index';
import Serverless from 'serverless';

const getLambdaCronInstance = (schedule: any = null) => {
	const serverlessConfiguration = {
		service: {
			provider: {
				name: 'aws',
				stage: 'dev',
			},
			custom: {
				'lambda-cron': {
					dev: {
						hello: { schedule },
					},
				},
			},
			functions: {
				hello: {
					handler: '.src/handler.hello',
					name: 'hello',
					events: [],
				},
			},
		},
		getProvider: () => ({ name: 'aws' }),
	} as unknown as any;

	return new LambdaCronJobs(serverlessConfiguration as any, {} as any);
};

const slsConfigWithoutPluginConfig = {
	service: {
		provider: {
			name: 'aws',
			stage: 'dev',
		},
	},
	getProvider: () => ({ name: 'aws' }),
} as unknown as any;

describe('Simple Validation', () => {
	it('No cron config', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementationOnce(() => {});
		const lambdaCron = new LambdaCronJobs(
			slsConfigWithoutPluginConfig,
			{} as any
		);
		lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		expect(logSpy).toHaveBeenCalledWith(
			'No cron job configurations found for stage dev'
		);
	});

	it('Schedule can not be empty', () => {
		const lambdaCron = getLambdaCronInstance();
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('schedule can not be empty');
	});

	it('Schedule type is invalid', () => {
		const lambdaCron = getLambdaCronInstance({ type: 'invalid' });
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Invalid schedule type: cron can be scheduled with only given types: "interval", "daily", "weekly", "monthly".'
		);
	});
});

describe('Interval based schedule', () => {
	// for schedule object validation
	it('unit is not provided', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'interval',
			params: {
				duration: 5,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Missing param: both "unit", "duration" are required for interval schedule'
		);
	});

	it('duration is not provided', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'interval',
			params: {
				unit: 'minute',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Missing param: both "unit", "duration" are required for interval schedule'
		);
	});

	it('wrong unit type', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'interval',
			params: {
				unit: 2,
				duration: 3,
			},
		});

		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: interval unit must be a string');
	});

	it('wrong unit provided', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'interval',
			params: {
				unit: 'second',
				duration: 4,
			},
		});

		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Invalid param: Invalid unit provided. Valid units are: day,hour,minute'
		);
	});

	it('wrong duration type provided', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'interval',
			params: {
				unit: 'minute',
				duration: 'invalid',
			},
		});

		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: interval duration must be a number');
	});

	it('valid schedule cron job for every 20 minute', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'interval',
			params: {
				unit: 'minute',
				duration: 20,
			},
		});

		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'interval' as unknown as CrontType,
				params: {
					unit: 'minute',
					duration: 20,
				},
			},
		});
		expect(result).toEqual([
			{
				schedule: {
					rate: ['rate(20 minute)'],
				},
			},
		]);
	});
});

describe('Daily Schedule', () => {
	it('Missing param: hour', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Missing param: hour is required for daily schedule');
	});

	it('Invalid param: hour is string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: '2',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: hour less then 0', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: -1,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: hour greater than 24', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: 26,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: minute is string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: 2,
				minute: '2',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Invalid param: minute less than 0', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: 0,
				minute: -1,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Invalid param: minute greater than 59', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: 2,
				minute: 61,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Valid: minute not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: 2,
			},
		});

		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'daily' as unknown as CrontType,
				params: {
					hour: 2,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(0 2 * * ? *)'],
				},
			},
		]);
	});

	it('Valid: minute and hour provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance({
			type: 'daily',
			params: {
				hour: 2,
				minute: 30,
			},
		});
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'daily' as unknown as CrontType,
				params: {
					hour: 2,
					minute: 30,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(30 2 * * ? *)'],
				},
			},
		]);
	});
});

describe('Weekly Schedule', () => {
	it('Missing param: day', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Missing param: day is required for weekly schedule');
	});

	it('Invalid param: day must be string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 2,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: day must be a string');
	});

	it('Invalid param: invalid day passed', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'someday',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Invalid param: invalid day passed. Allowed values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday'
		);
	});

	it('Invalid param: hour is string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: '2',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: hour less then 0', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: -1,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: hour greater than 24', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: 26,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: minute is string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: 2,
				minute: '2',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Invalid param: minute less than 0', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: 0,
				minute: -1,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Invalid param: minute greater than 59', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: 2,
				minute: 61,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Valid: hour and minute not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
			},
		});

		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'weekly' as unknown as CrontType,
				params: {
					day: 'sunday',
				},
			},
		});

		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(0 0 ? * 1 *)'],
				},
			},
		]);
	});

	it('Valid: minute is not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: 2,
			},
		});
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'weekly' as unknown as CrontType,
				params: {
					day: 'sunday',
					hour: 2,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(0 2 ? * 1 *)'],
				},
			},
		]);
	});

	it('Valid: hour is not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance();
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'weekly' as unknown as CrontType,
				params: {
					day: 'sunday',
					minute: 2,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(2 0 ? * 1 *)'],
				},
			},
		]);
	});

	it('Valid: Every Sunday at 15:45', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance({
			type: 'weekly',
			params: {
				day: 'sunday',
				hour: 2,
			},
		});
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'weekly' as unknown as CrontType,
				params: {
					day: 'sunday',
					hour: 15,
					minute: 45,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(45 15 ? * 1 *)'],
				},
			},
		]);
	});
});

describe('monthly Schedule', () => {
	it('Missing param: day', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Missing param: day is required for monthly schedule');
	});

	it('Invalid param: day must be number', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 'sunday',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Invalid param: day must be a number for monthly schedule between 1 and 31'
		);
	});

	it('Invalid param: day less than 1', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 0,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Invalid param: day must be a number for monthly schedule between 1 and 31'
		);
	});

	it('Invalid param: day greater than 31', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 32,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow(
			'Invalid param: day must be a number for monthly schedule between 1 and 31'
		);
	});

	it('Invalid param: hour is string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 2,
				hour: '2',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: hour less then 0', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 2,
				hour: -1,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: hour greater than 24', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 2,
				hour: 26,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: hour must be a number be between 0 and 24');
	});

	it('Invalid param: minute is string', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 2,
				hour: 2,
				minute: '2',
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Invalid param: minute less than 0', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 2,
				hour: 0,
				minute: -1,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Invalid param: minute greater than 59', () => {
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 2,
				hour: 2,
				minute: 60,
			},
		});
		expect(() => {
			lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		}).toThrow('Invalid param: minute must be a number between 0 and 59');
	});

	it('Valid: hour and minute not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance();

		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'monthly' as unknown as CrontType,
				params: {
					day: 3,
				},
			},
		});

		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(0 0 3 * ? *)'],
				},
			},
		]);
	});

	it('Valid: minute is not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance();
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'monthly' as unknown as CrontType,
				params: {
					day: 2,
					hour: 15,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(0 15 2 * ? *)'],
				},
			},
		]);
	});

	it('Valid: hour is not provided', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance({
			type: 'monthly',
			params: {
				day: 'sunday',
				hour: 2,
			},
		});
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'monthly' as unknown as CrontType,
				params: {
					day: 12,
					minute: 34,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(34 0 12 * ? *)'],
				},
			},
		]);
	});

	it('Valid: Every 15th at 15:45', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const lambdaCron = getLambdaCronInstance();
		const result = lambdaCron.getScheduleEvent({
			schedule: {
				type: 'monthly' as unknown as CrontType,
				params: {
					day: 15,
					hour: 15,
					minute: 45,
				},
			},
		});
		expect(logSpy).toHaveBeenCalled();
		expect(result).toEqual([
			{
				schedule: {
					rate: ['cron(45 15 15 * ? *)'],
				},
			},
		]);
	});
	
	it('Valid: Every 16th at 16:16', () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		const slsConfigWithFunctionWithoutEvents = {
			service: {
				provider: {
					name: 'aws',
					stage: 'dev',
				},
				custom: {
					'lambda-cron': {
						dev: {
							hello: {
								schedule: {
									type: 'monthly' as unknown as CrontType,
									params: {
										day: 16,
										hour: 16,
										minute: 16,
									},
								},
							},
						},
					},
				},
				functions: {
					hello: {
						handler: '.src/handler.hello',
						name: 'hello',
					},
				},
			},
			getProvider: () => ({ name: 'aws' }),
		} as unknown as any;
		const lambdaCron = new LambdaCronJobs(slsConfigWithFunctionWithoutEvents, {} as any);
		lambdaCron.hooks[BEFORE_PACKAGE_HOOK]();
		expect(logSpy).toHaveBeenCalled();
	});
});
