import clsx from "clsx";
import * as React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Label,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	RadialBar,
	RadialBarChart,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	useChart,
} from "../../common/Chart";
import * as commonStyles from "../../common/Chart/styles.module.css";
import * as styles from "./styles.module.css";
import { getWeekNumber } from "./utils";

export type Column =
	| {
			id: string;
			title: string;
			type: "select";
			options: {
				id: string;
				title: string;
			}[];
	  }
	| {
			id: string;
			title: string;
			type: "status";
			isStatus?: boolean;
	  }
	| {
			id: string;
			title: string;
			type: "date";
	  }
	| {
			id: string;
			title: string;
			type: "multiSelect";
			options: {
				id: string;
				title: string;
			}[];
	  }
	| {
			id: string;
			title: string;
			type: "user";
	  }
	| {
			id: string;
			title: string;
			type: "text";
	  }
	| {
			id: string;
			title: string;
			type: "number";
	  };

export type Cell = {
	id: string;
	createdAt: string;
	rowId: string;
	columnId: string;
	textValue: string | null;
	numberValue: number | null;
	dateValue: string | null;
	selectValue: string | null;
	statusValue: string | null;
	userValue: string | null;
	multiSelectValue: string[] | null;
};

export type Row = {
	id: string;
	cells: Cell[];
	statusCells: Cell[];
};

export type Filter = {
	columnId: string;
	operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "includes";
	textValue: string | null;
	numberValue: number | null;
	dateValue: string | null;
	selectValue: string | null;
	multiSelectValue: string[] | null;
};

export type Status = {
	id: string;
	title: string;
};

export type ChartProps =
	| {
			chartType: "bar";
			columns: Column[];
			rows: Row[]; // raw values (index matches columns)
			filters?: Filter[];
			statusById: Record<string, string>;
			userById: Record<string, string>;
			option1: string; // x-axis (colummns)
			option2: "count" | "percentage"; // y-axis (
			option3?: "week" | "month" | "year"; // if x-axis is date, then this is the date grouping
	  }
	| {
			chartType: "line";
			columns: Column[];
			rows: Row[];
			filters?: Filter[];
			statusById: Record<string, string>;
			userById: Record<string, string>;
			option1: "date"; // x-axis (colummns)
			option2: "count" | "percentage"; // y-axis (
			option3: "week" | "month" | "year";
	  }
	| {
			chartType: "doughnut";
			columns: Column[];
			filters?: Filter[];
			statusById: Record<string, string>;
			userById: Record<string, string>;
			rows: Row[];
			option1: string; // label
			option3: "week" | "month" | "year";
	  }
	| {
			chartType: "radar";
			columns: Column[];
			filters?: Filter[];
			statusById: Record<string, string>;
			userById: Record<string, string>;
			rows: Row[];
			option1: string; // primary grouping (axis)
			option2: string; // secondary grouping (axis) (used by drill)
	  }
	| {
			chartType: "polar";
			columns: Column[];
			filters?: Filter[];
			statusById: Record<string, string>;
			userById: Record<string, string>;
			rows: Row[];
			option1: string; // primary grouping (axis)
			option2: string; // secondary grouping (axis) (used by drill)
			option3: "week" | "month" | "year"; //not used?
	  }
	| {
			chartType: "radial";
			columns: Column[];
			statusById: Record<string, string>;
			userById: Record<string, string>;
			filters?: Filter[];
			rows: Row[];
	  };

const COMPLETE_STATUS = "C79zikw8f3HPM9Qiien4a";
const INCOMPLETE_STATUS = "KQCXxinM46CFcrtiqJyUm";
const IN_PROGRESS_STATUS = "y6VAKbHHdVxznKwq9Tz7r";
const NA_STATUS = "nGb3y8EWNbExDPbX8thjc";
function rowIsCompleted(row: Row, asOfDate?: Date): boolean {
	const cell = asOfDate
		? row.statusCells.find((sc) => {
				const createdAt = new Date(sc.createdAt!);
				return createdAt.getTime() <= asOfDate.getTime();
			})
		: row.statusCells.at(0);
	if (!cell) return false;
	switch (cell.statusValue) {
		case undefined:
			return false;
		case INCOMPLETE_STATUS:
			return false;
		case IN_PROGRESS_STATUS:
			const statusCellIdx = row.statusCells.findIndex(
				(sc) => sc.id === cell.id,
			);
			if (statusCellIdx === -1) return true; // this should never happen
			const nextStatusCell = row.statusCells[statusCellIdx + 1];
			if (!nextStatusCell) return false;
			if ([COMPLETE_STATUS, NA_STATUS].includes(nextStatusCell.statusValue!))
				return true;
			return false;
		default:
			return true;
	}
}

function chartColorIdx(idx: number) {
	return (idx % 10) + 1;
}

export function Chart({
	config,
	statuses = [],
	users = [],
	playbookCreatedAt,
	...props
}: {
	config: ChartProps;
	statuses: Status[];
	users: Status[];
	playbookCreatedAt: Date;
}) {
	//console.log("victory-chart", config, statuses);
	config.statusById = React.useMemo(() => {
		return (
			statuses?.reduce(
				(memo, status) => {
					memo[status.id] = status.title;
					return memo;
				},
				{} as Record<string, string>,
			) ?? {}
		);
	}, [statuses.length]);
	config.userById = React.useMemo(() => {
		return (
			users?.reduce(
				(memo, user) => {
					memo[user.id] = user.title;
					return memo;
				},
				{} as Record<string, string>,
			) ?? {}
		);
	}, [users.length]);
	if (!config.rows?.length || !config.columns?.length) {
		return <div className={styles.noData}>No data</div>;
	}
	switch (config?.chartType) {
		case "bar":
			return <BarVariant config={config} {...props} />;
		case "line":
			return (
				<LineVariant
					config={config}
					playbookCreatedAt={playbookCreatedAt}
					{...props}
				/>
			);
		case "doughnut":
			return <DonutVariant config={config} {...props} />;
		case "radar":
			return <RadarVariant config={config} {...props} />;
		case "polar":
			return <PolarVariant config={config} {...props} />;
		case "radial":
			return <RadialVariant config={config} {...props} />;
		default:
			console.error("Unknown chart type", config);
			return null;
	}
}

function getCellValue(
	cell: Cell,
	type: Column["type"],
	statusById: Record<string, string> = {},
	userById: Record<string, string> = {},
	rawValue?: boolean,
) {
	switch (type) {
		case "select":
			return cell.selectValue;
		case "date":
			return new Date(cell.dateValue ?? 0).getTime();
		case "multiSelect":
			return cell.multiSelectValue;
		case "user":
			return rawValue
				? cell.userValue
				: (userById[cell.userValue!] ?? cell.userValue ?? "Unassigned");
		case "text":
			return cell.textValue;
		case "number":
			return cell.numberValue;
		case "status":
			return rawValue
				? cell.statusValue
				: (statusById[cell.statusValue!] ?? cell.statusValue);
		default:
			return null;
	}
}

function getFilterValue(cell: Filter, type: Column["type"]) {
	switch (type) {
		case "select":
			return cell.selectValue;
		case "date":
			return new Date(cell.dateValue ?? 0).getTime();
		case "multiSelect":
			return cell.multiSelectValue;
		case "user":
			return cell.multiSelectValue;
		case "text":
			return cell.textValue;
		case "number":
			return cell.numberValue;
		case "status":
			return cell.multiSelectValue;
		default:
			return null;
	}
}

function filterData(
	rows: Row[],
	columns: Column[],
	filters: Filter[] | undefined,
	statusById: Record<string, string> = {},
	userById: Record<string, string> = {},
) {
	if (!filters?.length) return rows;
	const columnTypesById = columns.reduce(
		(acc, column) => {
			acc[column.id] =
				column.type === "status" && column.isStatus ? "status" : column.type;
			return acc;
		},
		{} as Record<string, Column["type"]>,
	);
	return rows.filter((row) => {
		return filters.every((filter) => {
			const columnType = columnTypesById[filter.columnId] ?? "text";
			const cell = row.cells.find((c) => c.columnId === filter.columnId);
			if (!cell) return false;
			const cellValue = getCellValue(
				cell,
				columnType,
				statusById,
				userById,
				true,
			);
			const filterValue = getFilterValue(filter, columnType);
			switch (filter.operator ?? "=") {
				case "=":
					if (Array.isArray(filterValue) && Array.isArray(cellValue)) {
						return (
							(filterValue as string[]).some((value) =>
								(cellValue as string[])?.includes(value),
							) || false
						);
					} else if (Array.isArray(cellValue)) {
						return (
							(cellValue as string[])?.includes(filterValue as string) || false
						);
					} else if (Array.isArray(filterValue)) {
						return (
							(filterValue as string[])?.includes(cellValue as string) || false
						);
					}
					return cellValue === filterValue;
				case "!=":
					return cellValue !== filterValue;
				case ">":
					return cellValue! > filterValue!;
				case "<":
					return cellValue! < filterValue!;
				case ">=":
					return cellValue! >= filterValue!;
				case "<=":
					return cellValue! <= filterValue!;
				case "includes":
					return (
						(cellValue as string)?.includes(filterValue as string) || false
					);
				default:
					return false;
			}
		});
	});
}

type PeriodType = "week" | "month" | "year";

interface Period {
	start: Date;
	end: Date;
}

function alignStartDate(date: Date, periodType: PeriodType): Date {
	const aligned = new Date(date.getTime());

	switch (periodType) {
		case "week":
			// Weeks start on Monday (day 1)
			// getDay() returns 0 (Sun),1(Mon),2(Tue),3(Wed),4(Thu),5(Fri),6(Sat)
			// To get Monday, we find how many days we need to go back:
			// If day = 0 (Sun), go back 6 days
			// If day = 1 (Mon), go back 0 days
			// If day = 2 (Tue), go back 1 day, etc.
			const dayOfWeek = aligned.getDay();
			const offset = (dayOfWeek + 6) % 7; // number of days to go back to get Monday
			aligned.setDate(aligned.getDate() - offset);
			break;
		case "month":
			// Align to the 1st of the month
			aligned.setDate(1);
			break;
		case "year":
			// Align to Jan 1 of that year
			aligned.setMonth(0); // January
			aligned.setDate(1);
			break;
	}

	return aligned;
}

function alignEndDate(date: Date, periodType: PeriodType): Date {
	const aligned = new Date(date.getTime());

	switch (periodType) {
		case "week":
			// Weeks end on Sunday
			// If day = 0 (Sun), go forward 0 days
			// If day = 1 (Mon), go forward 6 days
			// If day = 2 (Tue), go forward 5 days, etc.
			const dayOfWeek = aligned.getDay();
			const forwardOffset = (7 - dayOfWeek) % 7;
			aligned.setDate(aligned.getDate() + forwardOffset);
			break;
		case "month":
			// Align to the last day of that month
			// Move to the next month at the 1st, then go back one day
			aligned.setMonth(aligned.getMonth() + 1, 1);
			aligned.setDate(aligned.getDate() - 1);
			break;
		case "year":
			// Align to Dec 31 of that year
			aligned.setMonth(11, 31); // December is month 11, day 31
			break;
	}

	return aligned;
}

function nextPeriodStart(date: Date, periodType: PeriodType): Date {
	const nextStart = new Date(date.getTime());
	switch (periodType) {
		case "week":
			// Next period starts the day after the current Sunday
			nextStart.setDate(nextStart.getDate() + 1);
			break;
		case "month":
			// Next period starts on the 1st of the next month
			nextStart.setMonth(nextStart.getMonth() + 1, 1);
			break;
		case "year":
			// Next period starts on Jan 1 of the next year
			nextStart.setFullYear(nextStart.getFullYear() + 1, 0, 1);
			break;
	}
	return nextStart;
}

function periodEnd(date: Date, periodType: PeriodType): Date {
	const currentEnd = new Date(date.getTime());
	switch (periodType) {
		case "week":
			// end = start + 6 days (Monday-based week)
			currentEnd.setDate(currentEnd.getDate() + 6);
			break;
		case "month":
			// end = last day of the month starting from `date`
			// To find the last day of the month:
			currentEnd.setMonth(currentEnd.getMonth() + 1, 1);
			currentEnd.setDate(currentEnd.getDate() - 1);
			break;
		case "year":
			// end = Dec 31 of that year
			currentEnd.setMonth(11, 31);
			break;
	}
	return currentEnd;
}

function generatePeriods(
	startDate: Date,
	endDate: Date,
	periodType: PeriodType,
): Period[] {
	// Align the provided start and end to full periods
	const adjustedStart = alignStartDate(startDate, periodType);
	const adjustedEnd = alignEndDate(endDate, periodType);

	const periods: Period[] = [];

	let currentStart = new Date(adjustedStart.getTime());
	while (currentStart <= adjustedEnd) {
		let currentEnd = periodEnd(currentStart, periodType);
		if (currentEnd > adjustedEnd) {
			currentEnd = new Date(adjustedEnd.getTime());
		}

		periods.push({
			start: new Date(currentStart.getTime()),
			end: new Date(currentEnd.getTime()),
		});

		// Move to the next period start
		currentStart = nextPeriodStart(currentEnd, periodType);
	}

	return periods;
}

function bucketDataByColumn(
	rows: Row[],
	column: Column,
	dateGrouping: PeriodType | undefined,
	statusById: Record<string, string>,
	userById: Record<string, string>,
) {
	switch (column?.type) {
		case "select":
			const valuesById = column.options.reduce(
				(acc, option) => {
					acc[option.id] = option.title;
					return acc;
				},
				{} as Record<string, string>,
			);
			return Object.groupBy(rows, (row) => {
				const cell = row.cells.find((c) => c.columnId === column.id);
				if (!cell) return "Unknown";
				return valuesById[cell.selectValue ?? ""] ?? "Unknown";
			});
		case "date":
			return Object.groupBy(rows, (row) => {
				const cell = row.cells.find((c) => c.columnId === column.id);
				if (!cell) return "Unknown";
				switch (dateGrouping) {
					case "week":
						const [year, week] = getWeekNumber(new Date(cell.dateValue!));
						return `${year}-${week}`;
					case "month":
						return `${new Date(cell.dateValue!).getUTCFullYear()}-${
							new Date(cell.dateValue!).getUTCMonth() + 1
						}`;
					case "year":
						return new Date(cell.dateValue!).getUTCFullYear();
					default:
						return cell.dateValue as string;
				}
			});
		case "multiSelect":
			const groups: Record<string, Row[]> = {};
			rows.forEach((row) => {
				const cell = row.cells.find((c) => c.columnId === column.id);
				if (!cell) return;
				cell.multiSelectValue?.forEach((value) => {
					(groups[value] ?? ([] as Row[])).push(row);
				});
			});
			return groups;
		case "user":
			return Object.groupBy(rows, (row) => {
				const cell = row.cells.find((c) => c.columnId === column.id)!;
				if (!cell) return "Unassigned";
				return userById[cell.userValue!] ?? cell.userValue ?? "Unassigned";
			});
		case "text":
			return Object.groupBy(rows, (row) => {
				const cell = row.cells.find((c) => c.columnId === column.id)!;
				if (!cell) return "Unknown";
				return cell.textValue ?? "Unknown";
			});
		case "number":
			// not really supported but here anyway
			return Object.groupBy(rows, (row) => {
				const cell = row.cells.find((c) => c.columnId === column.id)!;
				if (!cell) return "Unknown";
				return String(cell.numberValue) ?? "Unknown";
			});
		case "status":
			// not really supported but here anyway
			return Object.groupBy(rows, (row) => {
				const cell = row.cells.find((c) => c.columnId === column.id)!;
				if (!cell) return "No status";
				return statusById[cell.statusValue!] ?? "No status";
			});
	}
}

function BarVariant({
	config,
	className,
	...props
}: {
	config: Extract<ChartProps, { chartType: "bar" }>;
	className?: string;
}) {
	const column = config.columns.find((c) => c.id === config.option1)!;
	if (!column) {
		return <div className={styles.noData}>Missing column</div>;
	}
	const filteredRows = filterData(
		config.rows,
		config.columns,
		config.filters,
		config.statusById,
		config.userById,
	);
	const groups = bucketDataByColumn(
		filteredRows,
		column,
		config.option3,
		config.statusById,
		config.userById,
	);
	const chartConfig: ChartConfig = {};
	const chartData = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([label, rows], idx) => {
		if (!rows || !rows.length) {
			return {
				label,
				value: 0,
				fill: `var(--chart-${chartColorIdx(idx)})`,
			};
		}
		chartConfig[label] = {
			label: label,
			color: `var(--chart-${chartColorIdx(idx)})`,
		};
		const countCompleted = rows?.reduce(
			(acc, row) => (rowIsCompleted(row) ? acc + 1 : acc),
			0,
		);
		const column = config.columns.find((c) => c.id === config.option1)!;
		return {
			label,
			value:
				column?.type === "status"
					? config.option2 === "count"
						? rows.length
						: (rows.length / filteredRows.length) * 100
					: config.option2 === "count"
						? rows.length
						: (countCompleted / rows.length) * 100,
			fill: `var(--chart-${chartColorIdx(idx)})`,
		};
	});
	return (
		<ChartContainer
			config={chartConfig}
			className={clsx(styles.chart, className)}
			{...props}
		>
			<BarChart accessibilityLayer data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey={"label"}
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					angle={-45}
					textAnchor="end"
				/>
				<YAxis axisLine={false} tickLine={false} tickMargin={10} />
				<ChartTooltip
					content={
						<ChartTooltipContent
							valueFormatter={(v) =>
								config.option2 === "count"
									? v.toLocaleString()
									: `${(v as number).toFixed(1)}%`
							}
						/>
					}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				<Bar
					name={config.option2 === "count" ? "Count" : "% Completed"}
					dataKey={"value"}
					radius={4}
				/>
			</BarChart>
		</ChartContainer>
	);
}

function LineVariant({
	config,
	className,
	playbookCreatedAt,
	...props
}: {
	config: Extract<ChartProps, { chartType: "line" }>;
	playbookCreatedAt: Date;
	className?: string;
}) {
	const filteredRows = filterData(
		config.rows,
		config.columns,
		config.filters,
		config.statusById,
		config.userById,
	);
	const periods = generatePeriods(
		playbookCreatedAt,
		new Date(),
		config.option3,
	);
	const chartData = periods.map((period) => {
		const countCompleted = filteredRows.reduce((acc, row) => {
			const isCompleted = rowIsCompleted(row, period.end);
			return isCompleted ? acc + 1 : acc;
		}, 0);
		return {
			x: formatDate(period.start),
			y:
				config.option2 === "count"
					? countCompleted
					: (countCompleted / filteredRows.length) * 100,
		};
	});
	const chartConfig = {
		y: {
			label: config.option2 === "count" ? "Completed" : "% Completed",
			color: "var(--chart-1)",
		},
	} satisfies ChartConfig;
	return (
		<ChartContainer
			config={chartConfig}
			className={clsx(styles.chart, className)}
			{...props}
		>
			<LineChart
				accessibilityLayer
				data={chartData}
				margin={{
					left: 12,
					right: 12,
				}}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="x"
					tickLine={false}
					tickMargin={8}
					axisLine={false}
					angle={-45}
					textAnchor="end"
				/>
				<YAxis
					axisLine={false}
					tickLine={false}
					tickMargin={10}
					tickCount={5}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							valueFormatter={(value) =>
								config.option2 === "count"
									? value.toLocaleString()
									: `${(value as number).toFixed(1)}%`
							}
						/>
					}
					cursor={false}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				<Line
					dataKey="y"
					stroke="var(--color-y)"
					strokeWidth={2}
					type="linear"
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}

function DonutVariant({
	config,
	className,
	...props
}: {
	config: Extract<ChartProps, { chartType: "doughnut" }>;
	className?: string;
}) {
	const column = config.columns.find((c) => c.id === config.option1)!;
	if (!column) {
		return <div className={styles.noData}>Missing column</div>;
	}
	const filteredRows = filterData(
		config.rows,
		config.columns,
		config.filters,
		config.statusById,
		config.userById,
	);
	const groups = bucketDataByColumn(
		filteredRows,
		column,
		config.option3,
		config.statusById,
		config.userById,
	);
	const chartConfig: ChartConfig = {};
	const chartData = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([label, rows], idx) => {
		if (!rows) {
			return {
				label,
				value: 0,
				fill: `var(--chart-${chartColorIdx(idx)})`,
			};
		}
		chartConfig[label] = {
			label: label,
			color: `var(--chart-${chartColorIdx(idx)})`,
		};
		return {
			label,
			value: rows.length,
			percent: (rows.length / filteredRows.length) * 100,
			fill: `var(--chart-${chartColorIdx(idx)})`,
		};
	});
	return (
		<ChartContainer
			config={chartConfig}
			className={clsx(styles.chart, className)}
			{...props}
		>
			<PieChart data={chartData}>
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent hideLabel />}
					formatter={(value, name, item, _idx, payload) => {
						return (
							<>
								<div
									className={clsx(
										commonStyles.tooltipIndicator,
										commonStyles.dot,
									)}
									style={
										{
											"--color-bg": item.payload.fill,
											"--color-border": item.payload.fill,
										} as React.CSSProperties
									}
								/>
								<div
									className={commonStyles.tooltipContent}
									style={{
										minWidth: "100px",
									}}
								>
									<div className={commonStyles.tooltipContentInner}>
										<span className={commonStyles.tooltipContentInner}>
											{name}
										</span>
									</div>
									{value && (
										<span className={commonStyles.tooltipContentValue}>
											{value} ({(payload as any)?.payload?.percent?.toFixed(1)}
											%)
										</span>
									)}
								</div>
							</>
						);
					}}
				/>
				<Pie
					startAngle={90}
					endAngle={-270}
					data={chartData}
					dataKey="value"
					nameKey="label"
					innerRadius={60}
					strokeWidth={5}
				/>
				<Legend />
			</PieChart>
		</ChartContainer>
	);
}

function RadialVariant({
	config,
	className,
	...props
}: {
	config: Extract<ChartProps, { chartType: "radial" }>;
	className?: string;
}) {
	const filteredRows = filterData(
		config.rows,
		config.columns,
		config.filters,
		config.statusById,
		config.userById,
	);
	const completedRowCount = filteredRows.reduce((acc, row) => {
		return rowIsCompleted(row) ? acc + 1 : acc;
	}, 0);
	const percentCompleted = completedRowCount / filteredRows.length;
	const chartData = [
		{
			label: "Percent completed",
			value: completedRowCount,
			fill: "var(--chart-1)",
		},
	];
	const chartConfig = {
		value: {
			label: "Completed",
		},
	} satisfies ChartConfig;
	return (
		<ChartContainer
			config={chartConfig}
			className={clsx(styles.chart, className)}
			{...props}
		>
			<RadialBarChart
				data={chartData}
				startAngle={90}
				endAngle={-360 * percentCompleted + 90}
				innerRadius={80}
				outerRadius={140}
			>
				<PolarGrid
					gridType="circle"
					radialLines={false}
					stroke="none"
					className={styles.polarGrid}
					polarRadius={[86, 74]}
				/>
				<RadialBar dataKey="value" background />
				<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
					<Label
						content={({ viewBox }) => {
							if (viewBox && "cx" in viewBox && "cy" in viewBox) {
								return (
									<text
										x={viewBox.cx}
										y={viewBox.cy}
										textAnchor="middle"
										dominantBaseline="middle"
									>
										<tspan
											x={viewBox.cx}
											y={viewBox.cy}
											className={styles.donutLabel}
										>
											{(percentCompleted * 100).toFixed(0)}%
										</tspan>
										<tspan
											x={viewBox.cx}
											y={(viewBox.cy || 0) + 24}
											className={styles.donutLabelSecondary}
										>
											Completed
										</tspan>
									</text>
								);
							}
						}}
					/>
				</PolarRadiusAxis>
			</RadialBarChart>
		</ChartContainer>
	);
}

function RadarVariant({
	config,
	className,
	...props
}: {
	config: Extract<ChartProps, { chartType: "radar" }>;
	className?: string;
}) {
	const [selectedBucket, setSelectedBucket] = React.useState<string | null>(
		null,
	);
	const column = config.columns.find((c) => c.id === config.option1)!;
	if (!column) {
		return <div className={styles.noData}>Missing column</div>;
	}
	const filteredRows = filterData(
		config.rows,
		config.columns,
		config.filters,
		config.statusById,
		config.userById,
	);
	let groups = bucketDataByColumn(
		filteredRows,
		column,
		"year",
		config.statusById,
		config.userById,
	);
	if (selectedBucket) {
		groups = bucketDataByColumn(
			groups[selectedBucket]!,
			config.columns.find((c) => c.id === config.option2)!,
			"year",
			config.statusById,
			config.userById,
		);
	}
	if (!groups) {
		if (selectedBucket) {
			return (
				<div className={styles.noData} onClick={() => setSelectedBucket(null)}>
					No data. Click to go back.
				</div>
			);
		}
		return <div className={styles.noData}>No data</div>;
	}
	const chartConfig: ChartConfig = {};
	const chartData = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([label, rows], idx) => {
		if (!rows) {
			return {
				label,
				value: 0,
				name: "% Complete",
				fill: `var(--chart-${chartColorIdx(idx)})`,
			};
		}
		chartConfig[label] = {
			label: label,
			color: `var(--chart-${chartColorIdx(idx)})`,
		};
		const countComplete = rows?.reduce((acc, row) => {
			return rowIsCompleted(row) ? acc + 1 : acc;
		}, 0);
		return {
			label,
			name: "% Complete",
			value: (countComplete / rows.length) * 100,
			fill: `var(--chart-${chartColorIdx(idx)})`,
		};
	});
	return (
		// @ts-ignore
		<ChartContainer
			config={chartConfig}
			className={clsx(styles.chart, className)}
			{...props}
		>
			{selectedBucket ? (
				<BackButton onClick={() => setSelectedBucket(null)} />
			) : null}
			<RadarChart data={chartData}>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							valueFormatter={(value) => `${(value as number).toFixed(1)}%`}
						/>
					}
				/>
				<PolarAngleAxis dataKey="label" />
				<PolarGrid />
				<Radar
					name="% Complete"
					dataKey="value"
					fill="var(--color-value)"
					fillOpacity={0.6}
					dot={{
						r: 4,
						fillOpacity: 1,
					}}
					activeDot={{
						onClick: (_, payload) => {
							if (selectedBucket) return;
							setSelectedBucket((payload as any)?.payload?.label);
						},
					}}
				/>
			</RadarChart>
		</ChartContainer>
	);
}

// Polar Variant
function PolarVariant({
	config,
	className,
	...props
}: {
	config: Extract<ChartProps, { chartType: "polar" }>;
	className?: string;
}) {
	const [selectedBucket, setSelectedBucket] = React.useState<string | null>(
		null,
	);
	const ref = React.useRef();
	const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
	const column = config.columns.find((c) => c.id === config.option1)!;

	React.useEffect(() => {
		const node: HTMLElement = ref.current as any;
		if (!node) return;

		const observer = new ResizeObserver((entries) => {
			entries.forEach((entry) => {
				setDimensions({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			});
		});

		observer.observe(node);
		return () => observer.unobserve(node);
	}, [ref]);

	if (!column) {
		return <div className={styles.noData}>Missing column</div>;
	}

	const filteredRows = filterData(
		config.rows,
		config.columns,
		config.filters,
		config.statusById,
		config.userById,
	);
	let groups = bucketDataByColumn(
		filteredRows,
		column,
		config.option3,
		config.statusById,
		config.userById,
	);
	if (selectedBucket) {
		groups = bucketDataByColumn(
			groups[selectedBucket]!,
			config.columns.find((c) => c.id === config.option2)!,
			config.option3,
			config.statusById,
			config.userById,
		);
	}
	if (!groups) {
		if (selectedBucket) {
			return (
				<div className={styles.noData} onClick={() => setSelectedBucket(null)}>
					No data. Click to go back.
				</div>
			);
		}
		return <div className={styles.noData}>No data</div>;
	}
	const chartConfig: ChartConfig = {};
	const chartData = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([label, rows], idx) => {
		if (!rows || !rows.length) {
			return {
				label,
				id: label,
				value: 0,
				percent: 0,
				outerRadius: 0,
				fill: `var(--chart-${chartColorIdx(idx)})`,
			};
		}
		chartConfig[label] = {
			label: label,
			color: `var(--chart-${chartColorIdx(idx)})`,
		};
		const countComplete = rows?.reduce(
			(acc, row) => (rowIsCompleted(row) ? acc + 1 : acc),
			0,
		);
		return {
			label,
			value: (rows.length / filteredRows.length) * 100,
			percent: (countComplete / rows.length) * 100,
			outerRadius: countComplete / rows.length,
			fill: `var(--chart-${chartColorIdx(idx)})`,
		};
	});

	const centerX = dimensions.width / 2;
	const centerY = dimensions.height / 2;
	//console.log(centerX, centerY);
	return (
		// @ts-ignore
		<ChartContainer
			config={chartConfig}
			className={clsx(styles.chart, className)}
			width={dimensions.width}
			height={dimensions.height}
			ref={ref}
			{...props}
		>
			{selectedBucket ? (
				<BackButton onClick={() => setSelectedBucket(null)} />
			) : null}
			<PieChart data={chartData} margin={{ right: 5 }}>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							hideLabel
							formatter={(value, name, item, _idx, payload) => {
								return (
									<>
										<div
											className={clsx(
												commonStyles.tooltipIndicator,
												commonStyles.dot,
											)}
											style={
												{
													"--color-bg": item.payload.fill,
													"--color-border": item.payload.fill,
												} as React.CSSProperties
											}
										/>
										<div
											className={commonStyles.tooltipContent}
											style={{
												minWidth: "100px",
											}}
										>
											<div className={commonStyles.tooltipContentInner}>
												<span className={commonStyles.tooltipContentInner}>
													{name}
												</span>
											</div>
											{value && (
												<span className={commonStyles.tooltipContentValue}>
													{value?.toFixed(1)}% (
													{(payload as any)?.payload?.percent?.toFixed(1)}%
													completed)
												</span>
											)}
										</div>
									</>
								);
							}}
						/>
					}
				/>
				<PolarGrid cx={centerX} cy={centerY} gridType="circle" />
				<Pie
					data={chartData}
					dataKey="value"
					nameKey="label"
					strokeWidth={5}
					startAngle={90}
					endAngle={-270}
					cx={centerX}
					cy={centerY}
				>
					{chartData.map((entry, idx) => {
						return (
							// @ts-ignore
							<Cell
								key={entry.label}
								fill={entry.fill}
								// @ts-ignore
								outerRadius={entry.outerRadius ?? 0.001}
								onClick={() => {
									if (selectedBucket) return;
									setSelectedBucket(entry.label);
								}}
							/>
						);
					})}
				</Pie>
				<Legend />
			</PieChart>
		</ChartContainer>
	);
}

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<button className={styles.backButton} onClick={onClick} aria-label="Back">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="currentColor"
				viewBox="0 -960 960 960"
			>
				<path d="M360-240L120-480l240-240 56 56-144 144h568v80H272l144 144-56 56z"></path>
			</svg>
		</button>
	);
}

function formatDate(date: Date): string {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	const year = date.getFullYear().toString().slice(-2);

	return `${month}/${day}/${year}`;
}
