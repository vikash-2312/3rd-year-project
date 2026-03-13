import { addDays, format, isSameDay, startOfWeek, subWeeks } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type DayData = {
  date: Date;
  dayName: string; // TUE
  dayNumber: string; // 10
};

type WeeklyCalendarProps = {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
};

export function WeeklyCalendar({ selectedDate: propsSelectedDate, onDateSelect }: WeeklyCalendarProps) {
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(new Date());

  const selectedDate = propsSelectedDate || internalSelectedDate;
  const setSelectedDate = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(date);
    } else {
      setInternalSelectedDate(date);
    }
  };

  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Calculate item width to fit exactly 7 items on screen with gaps
  const screenWidth = Dimensions.get('window').width;
  // To make snapToInterval/pagingEnabled work perfectly in FlatList, 
  // the total rendered width of 7 items + gaps MUST equal the screenWidth exactly,
  // and the listContent should NOT have horizontal padding paddingHorizontal: 0
  const gap = 8;
  const totalGaps = gap * 6; // 6 gaps between 7 items
  // Add a pseudo padding inside the items to make them look nice while filling the width
  const paddingSides = 32;
  const availableWidth = screenWidth - paddingSides;
  const itemWidth = (availableWidth - totalGaps) / 7;

  // Generate a buffer of days: full weeks past, stopping at the end of the current week
  useEffect(() => {
    const today = new Date();
    // Start of the current week (Monday)
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    let days: DayData[] = [];

    // Let's generate exactly 12 weeks of data in the past
    // This makes paging exact: 7 items * 12 weeks.
    const WEEKS_IN_PAST = 12;
    const startDate = subWeeks(currentWeekStart, WEEKS_IN_PAST);

    // 12 weeks + current week = 13 weeks total * 7 days = 91 days
    const TOTAL_DAYS = (WEEKS_IN_PAST + 1) * 7;

    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = addDays(startDate, i);
      days.push({
        date: d,
        dayName: format(d, 'EEE').toUpperCase(),
        dayNumber: format(d, 'd'),
      });
    }

    setWeekDays(days);
  }, []);

  // Optional: Auto-scroll to today/selected date on mount once list is generated
  useEffect(() => {
    if (weekDays.length > 0) {
      // Find today's index
      const todayIndex = weekDays.findIndex(d => isSameDay(d.date, selectedDate));
      if (todayIndex !== -1 && flatListRef.current) {
        // Give layout a moment to calculate, then scroll to end of list (so current week is visible)
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    }
  }, [weekDays]);

  const renderItem = ({ item, index }: { item: DayData; index: number }) => {
    const isSelected = isSameDay(item.date, selectedDate);
    const isToday = isSameDay(item.date, new Date());

    // Add margin to first and last items of a week to simulate paddingHorizontal
    // This ensures total page width is exactly screenWidth
    const isFirstOfWeek = index % 7 === 0;
    const isLastOfWeek = index % 7 === 6;

    return (
      <View style={{
        marginLeft: isFirstOfWeek ? paddingSides / 2 : 0,
        marginRight: isLastOfWeek ? paddingSides / 2 : gap,
      }}>
        <TouchableOpacity
          style={[
            styles.dayContainer,
            { width: itemWidth },
            isSelected && styles.dayContainerSelected,
            isToday && !isSelected && styles.dayContainerToday
          ]}
          onPress={() => setSelectedDate(item.date)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dayName,
            isSelected && styles.dayNameSelected,
            isToday && !isSelected && styles.dayNameToday
          ]}>
            {item.dayName}
          </Text>

          <View style={[
            styles.dateCircle,
            isSelected && styles.dateCircleSelected,
            isToday && !isSelected && styles.dateCircleToday
          ]}>
            <Text style={[
              styles.dateNumber,
              isSelected && styles.dateNumberSelected,
              isToday && !isSelected && styles.dateNumberToday
            ]}>
              {item.dayNumber}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={weekDays}
        keyExtractor={(item) => item.date.toISOString()}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={true}
        snapToAlignment="start"
        snapToInterval={screenWidth}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        initialNumToRender={28}
        getItemLayout={(data, index) => (
          // Approximate width of day items (width + margins) for accurate scrollable indexing
          { length: screenWidth / 7, offset: (screenWidth / 7) * index, index }
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    // Add border bottom or shadow if required by design later
  },
  listContent: {
    paddingHorizontal: 0, // Padding added natively to the first/last item of a chunk
  },
  dayContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 30, // capsule shape around both
    borderWidth: 1,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
    marginRight: 0,
  },
  dayContainerSelected: {
    // Container itself doesn't change
  },
  dayContainerToday: {
  },
  dayName: {
    fontSize: 10,
    color: '#A0AEC0',
    marginBottom: 8,
    fontWeight: '600',
  },
  dayNameSelected: {
    color: '#009050',
    fontWeight: 'bold',
  },
  dayNameToday: {
    color: '#4A5568',
    fontWeight: 'bold',
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexShrink: 0,      // Prevent squishing on small screens
    minWidth: 32,       // Prevent text from widening the circle
    overflow: 'hidden', // Guarantee cutoff
  },
  dateCircleSelected: {
    backgroundColor: '#009050',
  },
  dateCircleToday: {
    backgroundColor: '#ECFDF5',
  },
  dateNumber: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '600',
  },
  dateNumberSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dateNumberToday: {
    color: '#2D3748',
    fontWeight: 'bold',
  }
});
