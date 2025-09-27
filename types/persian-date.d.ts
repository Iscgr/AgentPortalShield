declare module 'persian-date' {
  export default class PersianDate {
    constructor(input?: any, locale?: string, format?: string);
    
    format(format?: string): string;
    valueOf(): number;
    toCalendar(calendar: string): PersianDate;
    toLocale(locale: string): PersianDate;
    toLeapYearMode(mode: string): PersianDate;
    isDST(): boolean;
    isLeapYear(): boolean;
    isLeapYear(year: number): boolean;
    daysInMonth(): number;
    toDate(): Date;
    toArray(): number[];
    formatPersian: boolean;
    clone(): PersianDate;
    
    // Getters
    year(): number;
    month(): number;
    date(): number;
    hour(): number;
    minute(): number;
    second(): number;
    millisecond(): number;
    zone(): number;
    unix(): number;
    
    // Setters
    year(input: number): PersianDate;
    month(input: number): PersianDate;
    date(input: number): PersianDate;
    hour(input: number): PersianDate;
    minute(input: number): PersianDate;
    second(input: number): PersianDate;
    millisecond(input: number): PersianDate;
    zone(input: number): PersianDate;
    unix(input: number): PersianDate;
    
    // Manipulations
    add(key: string, value: number): PersianDate;
    subtract(key: string, value: number): PersianDate;
    startOf(key: string): PersianDate;
    endOf(key: string): PersianDate;
    
    // Displaying
    diff(input: PersianDate, key?: string, asFloat?: boolean): number;
    diff(input: Date, key?: string, asFloat?: boolean): number;
    diff(input: number, key?: string, asFloat?: boolean): number;
    
    static unix(timestamp: number): PersianDate;
    static parse(dateString: string): PersianDate;
    static now(): PersianDate;
  }
}