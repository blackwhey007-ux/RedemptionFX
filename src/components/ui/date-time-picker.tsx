'use client'

import React, { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  showTimeSelect?: boolean
  showTimeSelectOnly?: boolean
  timeFormat?: string
  dateFormat?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  className?: string
  label?: string
  required?: boolean
  error?: string
}

const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({
    value,
    onChange,
    placeholder = "Select date and time",
    showTimeSelect = true,
    showTimeSelectOnly = false,
    timeFormat = "HH:mm",
    dateFormat = "MMM dd, yyyy h:mm aa",
    minDate,
    maxDate,
    disabled = false,
    className,
    label,
    required = false,
    error
  }, ref) => {
    const CustomInput = forwardRef<HTMLInputElement, any>(({ value: inputValue, onClick }, customInputRef) => (
      <div className="relative" onClick={onClick}>
        <input
          ref={customInputRef}
          type="text"
          value={inputValue || ''}
          readOnly
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            error && "border-destructive focus:ring-destructive",
            className
          )}
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {showTimeSelectOnly ? (
            <Clock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Calendar className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    ))

    CustomInput.displayName = 'CustomInput'

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <DatePicker
          selected={value}
          onChange={onChange}
          showTimeSelect={showTimeSelect}
          showTimeSelectOnly={showTimeSelectOnly}
          timeFormat={timeFormat}
          timeIntervals={15}
          dateFormat={dateFormat}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          customInput={<CustomInput />}
          wrapperClassName="w-full"
          popperClassName="react-datepicker-popper"
          popperPlacement="bottom-start"
          showPopperArrow={false}
          fixedHeight
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

DateTimePicker.displayName = 'DateTimePicker'

export { DateTimePicker }
