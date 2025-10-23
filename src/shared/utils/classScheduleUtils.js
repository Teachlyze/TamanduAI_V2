/**
 * Utilities for calculating class schedules and next class times
 */

const DAY_MAP = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

/**
 * Calculate the next class occurrence based on weekly_schedule, start_date, and end_date
 * @param {Object} classData - Class data containing weekly_schedule, start_date, end_date
 * @returns {Date|null} - Next class date or null if no upcoming classes
 */
export const getNextClassDate = (classData) => {
  if (!classData) return null;

  const { weekly_schedule, start_date, end_date } = classData;

  // No schedule defined
  if (!weekly_schedule || !Array.isArray(weekly_schedule) || weekly_schedule.length === 0) {
    return null;
  }

  const now = new Date();
  const today = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

  // Check if class has ended
  if (end_date) {
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999); // End of day
    if (now > endDate) {
      return null; // Class period has ended
    }
  }

  // Check if class hasn't started yet
  if (start_date) {
    const startDate = new Date(start_date);
    startDate.setHours(0, 0, 0, 0); // Start of day
    if (now < startDate) {
      // Find first scheduled day on or after start_date
      const firstSchedule = weekly_schedule[0];
      const firstDayNum = DAY_MAP[firstSchedule.day];
      const startDayNum = startDate.getDay();
      
      let daysUntilFirst = (firstDayNum - startDayNum + 7) % 7;
      if (daysUntilFirst === 0 && startDate > now) {
        daysUntilFirst = 0; // Same day, use start_date
      }
      
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + daysUntilFirst);
      
      const [hours, minutes] = firstSchedule.start_time.split(':');
      nextDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      return nextDate;
    }
  }

  // Convert weekly_schedule to day numbers and sort
  const scheduleDays = weekly_schedule.map(s => ({
    dayNum: DAY_MAP[s.day],
    startTime: s.start_time,
    day: s.day
  })).sort((a, b) => a.dayNum - b.dayNum);

  // Try to find next class this week
  for (const schedule of scheduleDays) {
    const [hours, minutes] = schedule.startTime.split(':');
    const scheduleTime = parseInt(hours, 10) * 60 + parseInt(minutes, 10);

    if (schedule.dayNum === today && scheduleTime > currentTime) {
      // Class later today
      const nextClass = new Date(now);
      nextClass.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return nextClass;
    } else if (schedule.dayNum > today) {
      // Class later this week
      const daysUntil = schedule.dayNum - today;
      const nextClass = new Date(now);
      nextClass.setDate(now.getDate() + daysUntil);
      nextClass.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return nextClass;
    }
  }

  // No class found this week, get first class next week
  const firstSchedule = scheduleDays[0];
  const [hours, minutes] = firstSchedule.startTime.split(':');
  const daysUntil = (7 - today + firstSchedule.dayNum) % 7 || 7;
  
  const nextClass = new Date(now);
  nextClass.setDate(now.getDate() + daysUntil);
  nextClass.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

  // Verify it's not past end_date
  if (end_date) {
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);
    if (nextClass > endDate) {
      return null;
    }
  }

  return nextClass;
};

/**
 * Format next class date in a human-readable way
 * @param {Date} nextClassDate - Next class date
 * @returns {string} - Formatted string
 */
export const formatNextClass = (nextClassDate) => {
  if (!nextClassDate) return 'Sem aulas agendadas';

  const now = new Date();
  const diffMs = nextClassDate - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = nextClassDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  if (diffDays === 0) {
    return `Hoje às ${timeStr}`;
  } else if (diffDays === 1) {
    return `Amanhã às ${timeStr}`;
  } else if (diffDays < 7) {
    const dayName = nextClassDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} às ${timeStr}`;
  } else {
    return nextClassDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * Check if class is currently active
 * @param {Object} classData - Class data containing weekly_schedule, start_date, end_date
 * @returns {boolean} - True if class is currently in session
 */
export const isClassInSession = (classData) => {
  if (!classData || !classData.weekly_schedule) return false;

  const now = new Date();
  const today = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const schedule of classData.weekly_schedule) {
    if (DAY_MAP[schedule.day] === today) {
      const [startHours, startMinutes] = schedule.start_time.split(':');
      const [endHours, endMinutes] = schedule.end_time.split(':');
      
      const startTime = parseInt(startHours, 10) * 60 + parseInt(startMinutes, 10);
      const endTime = parseInt(endHours, 10) * 60 + parseInt(endMinutes, 10);

      if (currentTime >= startTime && currentTime <= endTime) {
        return true;
      }
    }
  }

  return false;
};
