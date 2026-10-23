// Utility service to determine current session based on IST time and doctor's schedule

export interface CurrentSessionInfo {
  date: string; // YYYY-MM-DD format
  sessionSlot: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night" | null;
  time: string; // HH:MM format
  timestamp: Date;
  isWorkingHours: boolean; // false if after 19:00 or no session found
}

class SessionTimeService {
  // Get current IST time
  getCurrentISTTime(): Date {
    // Get current UTC time
    const now = new Date();
    
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    
    return istTime;
  }

  // Determine session based on doctor's schedule or fallback to general times
  async getCurrentSessionForDoctor(doctor: any): Promise<CurrentSessionInfo> {
    const istTime = this.getCurrentISTTime();
    
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const currentTimeMinutes = hours * 60 + minutes;
    
    // Format date as YYYY-MM-DD
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    // Format time as HH:MM
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Get current day of week
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = daysOfWeek[istTime.getUTCDay()];
    
    let sessionSlot: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night" | null = null;
    let isWorkingHours = true;
    
    // Try to use doctor's weeklySchedule first
    if (doctor?.weeklySchedule && doctor.weeklySchedule.length > 0) {
      const daySchedule = doctor.weeklySchedule.find((s: any) => s.dayOfWeek === currentDay);
      
      if (daySchedule && daySchedule.slots && daySchedule.slots.length > 0) {
        // Check if current time falls within any slot
        for (const slot of daySchedule.slots) {
          const [startHour, startMin] = slot.startTime.split(':').map(Number);
          const [endHour, endMin] = slot.endTime.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
            sessionSlot = slot.session;
            break;
          }
        }
        
        // If no current slot found, find next upcoming slot
        if (!sessionSlot) {
          const upcomingSlot = daySchedule.slots
            .filter((slot: any) => {
              const [startHour, startMin] = slot.startTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              return startMinutes > currentTimeMinutes;
            })
            .sort((a: any, b: any) => {
              const [aHour, aMin] = a.startTime.split(':').map(Number);
              const [bHour, bMin] = b.startTime.split(':').map(Number);
              return (aHour * 60 + aMin) - (bHour * 60 + bMin);
            })[0];
          
          if (upcomingSlot) {
            sessionSlot = upcomingSlot.session;
          } else {
            // No upcoming slots today - after working hours
            isWorkingHours = false;
          }
        }
      } else {
        // Doctor has no slots for today - not working
        isWorkingHours = false;
      }
    }
    
    // Fallback to general times if no schedule found or doctor has old sessions array
    if (!sessionSlot && isWorkingHours) {
      sessionSlot = this.getSessionFromGeneralTime(hours, minutes);
      
      // Check if after 19:00 (7 PM)
      if (hours >= 19) {
        isWorkingHours = false;
        sessionSlot = null;
      }
      // Check if before 9:00 (9 AM) - use next upcoming session (Morning)
      else if (hours < 9) {
        sessionSlot = "Morning";
      }
    }
    
    return {
      date,
      sessionSlot,
      time,
      timestamp: istTime,
      isWorkingHours
    };
  }

  // Fallback: Determine session from general time ranges
  private getSessionFromGeneralTime(hours: number, minutes: number): "Morning" | "Afternoon" | "Evening" {
    const currentTimeMinutes = hours * 60 + minutes;
    
    // Morning: 9:00 - 12:00
    if (currentTimeMinutes >= 9 * 60 && currentTimeMinutes < 12 * 60) {
      return "Morning";
    }
    // Afternoon: 12:00 - 16:00
    else if (currentTimeMinutes >= 12 * 60 && currentTimeMinutes < 16 * 60) {
      return "Afternoon";
    }
    // Evening: 16:00 - 19:00
    else if (currentTimeMinutes >= 16 * 60 && currentTimeMinutes < 19 * 60) {
      return "Evening";
    }
    
    // Default to Morning for edge cases
    return "Morning";
  }

  // Get current session info without doctor (for backward compatibility)
  getCurrentSessionInfo(): CurrentSessionInfo {
    const istTime = this.getCurrentISTTime();
    
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    
    // Format date as YYYY-MM-DD
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    // Format time as HH:MM
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    const sessionSlot = this.getSessionFromGeneralTime(hours, minutes);
    const isWorkingHours = hours >= 9 && hours < 19;
    
    return {
      date,
      sessionSlot: isWorkingHours ? sessionSlot : null,
      time,
      timestamp: istTime,
      isWorkingHours
    };
  }

  // Check if session or date has changed
  hasSessionChanged(oldSession: CurrentSessionInfo, newSession: CurrentSessionInfo): boolean {
    return oldSession.date !== newSession.date || oldSession.sessionSlot !== newSession.sessionSlot;
  }
}

export default new SessionTimeService();
