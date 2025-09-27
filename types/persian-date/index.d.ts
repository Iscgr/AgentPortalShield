// Type definitions for persian-date
// Project: https://github.com/babakhani/PersianDate
// Definitions by: MarFaNet Team

declare module 'persian-date' {
  export default class PersianDate {
    constructor(input?: any, locale?: string, format?: string);

    // Properties
    formatPersian: boolean;

    // Getters/Setters (overloaded methods)
    year(): number;
    year(input: number): PersianDate;

    month(): number;
    month(input: number): PersianDate;

    date(): number;
    date(input: number): PersianDate;

    hour(): number;
    hour(input: number): PersianDate;

    minute(): number;
    minute(input: number): PersianDate;

    second(): number;
    second(input: number): PersianDate;

    millisecond(): number;
    millisecond(input: number): PersianDate;

    zone(): number;
    zone(input: number): PersianDate;

    unix(): number;
    unix(input: number): PersianDate;

    // Formatting & Conversion
    format(format?: string): string;
    valueOf(): number;
    toCalendar(calendar: string): PersianDate;
    toLocale(locale: string): PersianDate;
    toLeapYearMode(mode: string): PersianDate;
    toDate(): Date;
    toArray(): number[];
    clone(): PersianDate;

    // Query methods
    isDST(): boolean;
    isLeapYear(): boolean;
    isLeapYear(year: number): boolean;
    daysInMonth(): number;

    // Manipulation methods
    add(key: string, value: number): PersianDate;
    subtract(key: string, value: number): PersianDate;
    startOf(key: string): PersianDate;
    endOf(key: string): PersianDate;

    // Displaying
    diff(input: PersianDate | Date | number, key?: string, asFloat?: boolean): number;

    // Static methods
    static unix(timestamp: number): PersianDate;
    static parse(dateString: string): PersianDate;
    static now(): PersianDate;
  }
}