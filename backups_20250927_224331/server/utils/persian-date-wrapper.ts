/**
 * PersianDate Wrapper با تعریف تایپ کامل
 * 
 * این فایل یک wrapper برای کتابخانه persian-date ارائه می‌کند
 * که تعریف تایپ صحیح را فراهم می‌کند و مشکلات Type را حل می‌کند
 */

import PersianDateLib from 'persian-date';

class PersianDate {
  private instance: any;

  constructor(input?: any, locale?: string, format?: string) {
    this.instance = new PersianDateLib(input, locale, format);
  }

  // Proxying all methods to the original instance
  format(format?: string): string {
    return this.instance.format(format);
  }

  valueOf(): number {
    return this.instance.valueOf();
  }

  toCalendar(calendar: string): PersianDate {
    this.instance = this.instance.toCalendar(calendar);
    return this;
  }

  toLocale(locale: string): PersianDate {
    this.instance = this.instance.toLocale(locale);
    return this;
  }

  toLeapYearMode(mode: string): PersianDate {
    this.instance = this.instance.toLeapYearMode(mode);
    return this;
  }

  isDST(): boolean {
    return this.instance.isDST();
  }

  isLeapYear(year?: number): boolean {
    return year ? this.instance.isLeapYear(year) : this.instance.isLeapYear();
  }

  daysInMonth(): number {
    return this.instance.daysInMonth();
  }

  toDate(): Date {
    return this.instance.toDate();
  }

  toArray(): number[] {
    return this.instance.toArray();
  }

  clone(): PersianDate {
    return new PersianDate(this.instance.clone());
  }

  // Getters and Setters with method overloading
  year(input?: number): any {
    if (input === undefined) {
      return this.instance.year();
    }
    this.instance = this.instance.year(input);
    return this;
  }

  month(input?: number): any {
    if (input === undefined) {
      return this.instance.month();
    }
    this.instance = this.instance.month(input);
    return this;
  }

  date(input?: number): any {
    if (input === undefined) {
      return this.instance.date();
    }
    this.instance = this.instance.date(input);
    return this;
  }

  hour(input?: number): any {
    if (input === undefined) {
      return this.instance.hour();
    }
    this.instance = this.instance.hour(input);
    return this;
  }

  minute(input?: number): any {
    if (input === undefined) {
      return this.instance.minute();
    }
    this.instance = this.instance.minute(input);
    return this;
  }

  second(input?: number): any {
    if (input === undefined) {
      return this.instance.second();
    }
    this.instance = this.instance.second(input);
    return this;
  }

  millisecond(input?: number): any {
    if (input === undefined) {
      return this.instance.millisecond();
    }
    this.instance = this.instance.millisecond(input);
    return this;
  }

  zone(input?: number): any {
    if (input === undefined) {
      return this.instance.zone();
    }
    this.instance = this.instance.zone(input);
    return this;
  }

  unix(input?: number): any {
    if (input === undefined) {
      return this.instance.unix();
    }
    this.instance = this.instance.unix(input);
    return this;
  }

  // Manipulations
  add(key: string, value: number): PersianDate {
    this.instance = this.instance.add(key, value);
    return this;
  }

  subtract(key: string, value: number): PersianDate {
    this.instance = this.instance.subtract(key, value);
    return this;
  }

  startOf(key: string): PersianDate {
    this.instance = this.instance.startOf(key);
    return this;
  }

  endOf(key: string): PersianDate {
    this.instance = this.instance.endOf(key);
    return this;
  }

  // Static methods
  static unix(timestamp: number): PersianDate {
    return new PersianDate(PersianDateLib.unix(timestamp));
  }

  static now(): PersianDate {
    return new PersianDate(PersianDateLib.now());
  }

  static parse(dateString: string): PersianDate {
    return new PersianDate(PersianDateLib.parse(dateString));
  }
}

export default PersianDate;