/** @format */

import Serverless from 'serverless';
import Aws from 'serverless/plugins/aws/provider/awsProvider';

const CONFIG_KEY = 'lambda-cron';
export const BEFORE_PACKAGE_HOOK = 'before:package:initialize';
interface Functions {
	[key: string]:
		| Serverless.FunctionDefinitionHandler
		| Serverless.FunctionDefinitionImage;
}

interface PluginConfiguration {
	[key: string]: PluginConfigurationObject;
}
interface PluginConfigurationObject {
	schedule: CronScheduleBase;
	input?: Record<any, unknown>;
}

interface Hooks {
	[key: string]: () => void;
}
export enum CrontType {
	'daily',
	'interval',
	'monthly',
	'weekly',
}
interface CronScheduleBase {
	type: CrontType;
	params: Interval | Daily | Weekly | Monthly;
}

interface Interval {
	unit: string;
	duration: number;
}

interface Daily {
	hour: number;
	minute?: number;
}
interface Weekly {
	day: string;
	hour?: number;
	minute?: number;
}

interface Monthly {
	day: number;
	hour?: number;
	minute?: number;
}

const ALLOWED_INTERVAL_UNIT = ['day', 'hour', 'minute'];
const ALLOWED_DAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
];

const DAYS = new Map([
	['sunday', 1],
	['monday', 2],
	['tuesday', 3],
	['wednesday', 4],
	['thursday', 5],
	['friday', 6],
	['saturday', 7],
]);

export default class LambdaCronJobs {
	functions: Functions;
	service: any;
	provider: any;
	pluginConfig: PluginConfiguration;
	hooks: Hooks;
	stage: string;
	config: any;

	constructor(serverless: Serverless, options: Serverless.Options) {
		this.service = serverless.service;
		this.functions = this.service?.functions;
		this.stage = options?.stage ?? this.service.provider?.stage;
		this.provider = serverless.getProvider('aws');

		if ('custom' in this.service && CONFIG_KEY in this.service.custom)
			this.pluginConfig = this.service.custom[CONFIG_KEY];
		else this.pluginConfig = undefined as unknown as PluginConfiguration;

		this.hooks = {
			[BEFORE_PACKAGE_HOOK]: () => this.beforePackage(),
		};
	}

	private hasCronJobs() {
		return !!(this.pluginConfig && this.stage in this.pluginConfig);
	}

	private getStageConfig() {
		this.config = this.pluginConfig[this.stage];
	}

	private beforePackage() {
		try {
			if (!this.hasCronJobs()) {
				console.log(`No cron job configurations found for stage ${this.stage}`);
				return;
			}

			this.getStageConfig();

			for (let functionName in this.config) {
				this.addCronSchedule(functionName, this.config[functionName]);
			}
		} catch (error: any) {
			throw error;
		}
	}

	private addCronSchedule(
		functionName: string,
		cronJobConfig: PluginConfigurationObject
	) {
		const currentFunction = this.functions[functionName];
		currentFunction.events = currentFunction?.events ?? [];
		const cronSchedules: Aws.Event[] = this.getScheduleEvent(cronJobConfig);
		// Added scheduled event to lambda
		currentFunction.events = [...currentFunction.events, ...cronSchedules];
		console.log('scheduled cron for: ', {
			function: functionName,
			schedule: cronJobConfig.schedule,
		});
	}

	public getScheduleEvent(cronJobConfig: PluginConfigurationObject) {
		return [
			{
				schedule: {
					rate: [this.schedule(cronJobConfig.schedule)],
					input: cronJobConfig?.input,
				},
			},
		];
	}

	private schedule(schedule: CronScheduleBase) {
		if (!schedule) throw new Error('schedule can not be empty');
		const schedueType = schedule.type.toString();
		switch (schedueType) {
			case 'interval':
				return this.scheduleInterval(schedule.params as Interval);
			case 'daily':
				return this.scheduleDaily(schedule.params as Daily);
			case 'weekly':
				return this.scheduleWeekly(schedule.params as Weekly);
			case 'monthly':
				return this.scheduleMonthly(schedule.params as Monthly);
			default:
				throw new Error(
					'Invalid schedule type: cron can be scheduled with only given types: "interval", "daily", "weekly", "monthly".'
				);
		}
	}

	private scheduleInterval(interval: Interval) {
		if (!interval?.unit || !interval?.duration)
			throw new Error(
				'Missing param: both "unit", "duration" are required for interval schedule'
			);
		else if (typeof interval.unit != 'string')
			throw new Error('Invalid param: interval unit must be a string');
		else if (!ALLOWED_INTERVAL_UNIT.includes(interval.unit))
			throw new Error(
				'Invalid param: Invalid unit provided. Valid units are: ' +
					ALLOWED_INTERVAL_UNIT.toString()
			);
		else if (typeof interval.duration != 'number')
			throw new Error('Invalid param: interval duration must be a number');

		return `rate(${interval.duration} ${interval.unit})`;
	}

	private scheduleDaily = (daily: Daily) => {
		if (!('hour' in daily))
			throw new Error('Missing param: hour is required for daily schedule');
		else if (typeof daily.hour != 'number' || daily.hour < 0 || daily.hour > 24)
			throw new Error(
				'Invalid param: hour must be a number be between 0 and 24'
			);
		else if (daily.minute) {
			if (
				typeof daily.minute != 'number' ||
				daily.minute < 0 ||
				daily.minute > 59
			)
				throw new Error(
					'Invalid param: minute must be a number between 0 and 59'
				);
		} else {
			console.log('minute is not provided in params default value is set to 0');
		}

		const hours = daily.hour;
		const minutes = daily?.minute ?? 0;
		return `cron(${minutes} ${hours} * * ? *)`;
	};

	private scheduleWeekly(weekly: Weekly) {
		if (!weekly?.day)
			throw new Error('Missing param: day is required for weekly schedule');

		if (typeof weekly.day != 'string')
			throw new Error('Invalid param: day must be a string');

		if (!ALLOWED_DAYS.includes(weekly.day.toLowerCase()))
			throw new Error(
				'Invalid param: invalid day passed. Allowed values are: ' +
					ALLOWED_DAYS.toString().replaceAll(',', ', ')
			);

		if (weekly.hour) {
			if (typeof weekly.hour != 'number' || weekly.hour < 0 || weekly.hour > 24)
				throw new Error(
					'Invalid param: hour must be a number be between 0 and 24'
				);
		} else
			console.log('hour is not provided in params default value is set to 0');

		if (weekly.minute) {
			if (
				typeof weekly.minute != 'number' ||
				weekly.minute < 0 ||
				weekly.minute > 59
			)
				throw new Error(
					'Invalid param: minute must be a number between 0 and 59'
				);
		} else
			console.log('minute is not provided in params default value is set to 0');

		const day = weekly.day.toLowerCase();
		const hours = weekly?.hour ?? 0;
		const minutes = weekly?.minute ?? 0;
		return `cron(${minutes} ${hours} ? * ${DAYS.get(day)} *)`;
	}

	private scheduleMonthly(monthly: Monthly) {
		if (!('day' in monthly))
			throw new Error('Missing param: day is required for monthly schedule');

		if (typeof monthly.day != 'number' || monthly.day < 1 || monthly.day > 31)
			throw new Error(
				'Invalid param: day must be a number for monthly schedule between 1 and 31'
			);

		if (monthly?.hour) {
			if (
				typeof monthly.hour != 'number' ||
				monthly.hour < 0 ||
				monthly.hour > 24
			)
				throw new Error(
					'Invalid param: hour must be a number be between 0 and 24'
				);
		} else
			console.log('hour is not provided in params default value is set to 0');

		if (monthly.minute) {
			if (
				typeof monthly.minute != 'number' ||
				monthly.minute < 0 ||
				monthly.minute > 59
			)
				throw new Error(
					'Invalid param: minute must be a number between 0 and 59'
				);
		} else
			console.log('minute is not provided in params default value is set to 0');

		const day = monthly.day;
		const hours = monthly?.hour ?? 0;
		const minutes = monthly?.minute ?? 0;
		return `cron(${minutes} ${hours} ${day} * ? *)`;
	}
}
