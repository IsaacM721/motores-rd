'use client';

import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  isBefore,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AvailabilityCalendar } from '@/types';
import { getAvailabilityCalendar } from '@/services/availability';

interface BookingCalendarProps {
  motorcycleId: string;
  selectedRange: { start: Date | null; end: Date | null };
  onSelectRange: (range: { start: Date | null; end: Date | null }) => void;
  minDate?: Date;
  className?: string;
}

export function BookingCalendar({
  motorcycleId,
  selectedRange,
  onSelectRange,
  minDate = new Date(),
  className = '',
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [availability, setAvailability] = useState<AvailabilityCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingEnd, setSelectingEnd] = useState(false);

  useEffect(() => {
    async function loadAvailability() {
      setLoading(true);
      try {
        const data = await getAvailabilityCalendar(
          motorcycleId,
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1
        );
        setAvailability(data);
      } catch (error) {
        console.error('Failed to load availability:', error);
      }
      setLoading(false);
    }

    loadAvailability();
  }, [motorcycleId, currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (date: Date) => {
    const dayAvailability = availability?.days.find((d) => isSameDay(d.date, date));
    if (!dayAvailability?.isAvailable) return;
    if (isBefore(date, startOfDay(minDate))) return;

    if (!selectingEnd || !selectedRange.start) {
      // Start new selection
      onSelectRange({ start: date, end: null });
      setSelectingEnd(true);
    } else {
      // Complete selection
      if (isBefore(date, selectedRange.start)) {
        // If clicked date is before start, swap
        onSelectRange({ start: date, end: selectedRange.start });
      } else {
        onSelectRange({ start: selectedRange.start, end: date });
      }
      setSelectingEnd(false);
    }
  };

  const getDayClasses = (date: Date) => {
    const dayAvailability = availability?.days.find((d) => isSameDay(d.date, date));
    const isDisabled = !dayAvailability?.isAvailable || isBefore(date, startOfDay(minDate));
    const isBooked = dayAvailability?.isBooked;
    const isSelected =
      selectedRange.start &&
      selectedRange.end &&
      isWithinInterval(date, { start: selectedRange.start, end: selectedRange.end });
    const isStart = selectedRange.start && isSameDay(date, selectedRange.start);
    const isEnd = selectedRange.end && isSameDay(date, selectedRange.end);

    let classes = 'w-10 h-10 flex items-center justify-center text-sm rounded-full transition-all ';

    if (!isSameMonth(date, currentMonth)) {
      classes += 'text-gray-300 cursor-default ';
    } else if (isDisabled || isBooked) {
      classes += 'text-gray-300 line-through cursor-not-allowed ';
      if (isBooked) {
        classes += 'bg-red-100 ';
      }
    } else if (isStart || isEnd) {
      classes += 'bg-orange-500 text-white font-semibold cursor-pointer ';
    } else if (isSelected) {
      classes += 'bg-orange-100 text-orange-700 cursor-pointer ';
    } else {
      classes += 'hover:bg-gray-100 cursor-pointer ';
    }

    return classes;
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Pad start of month
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(startDay).fill(null);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array(35)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 bg-gray-100 rounded-full animate-pulse mx-auto"
              />
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="w-10 h-10" />
          ))}
          {days.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={getDayClasses(day)}
              disabled={
                !availability?.days.find((d) => isSameDay(d.date, day))?.isAvailable ||
                isBefore(day, startOfDay(minDate))
              }
            >
              {format(day, 'd')}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-100" />
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span>No disponible</span>
        </div>
      </div>

      {/* Selection info */}
      {selectedRange.start && (
        <div className="mt-4 p-3 bg-orange-50 rounded-lg text-sm">
          {selectedRange.end ? (
            <p>
              <span className="font-semibold">Fechas seleccionadas:</span>{' '}
              {format(selectedRange.start, 'dd MMM', { locale: es })} -{' '}
              {format(selectedRange.end, 'dd MMM yyyy', { locale: es })}
            </p>
          ) : (
            <p className="text-orange-600">Selecciona la fecha de devolución</p>
          )}
        </div>
      )}
    </div>
  );
}
