import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 16, 
  borderRadius = 8,
  style,
}) => {
  const animation = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      animation.setValue(0);
    });
    
    const interval = setInterval(() => {
      Animated.timing(animation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        animation.setValue(0);
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
        {
          backgroundColor: animation.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['#F3F4F6', '#E5E7EB', '#F3F4F6'],
          }),
        },
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <Skeleton width="100%" height={120} borderRadius={16} />
    <Skeleton width="80%" height={20} borderRadius={8} style={styles.cardTitle} />
    <Skeleton width="60%" height={14} borderRadius={6} style={styles.cardSubtitle} />
    <Skeleton width="40%" height={14} borderRadius={6} style={styles.cardSubtitle} />
  </View>
);

export const SkeletonRosterRow: React.FC = () => (
  <View style={styles.rosterRow}>
    <Skeleton width={48} height={48} borderRadius={24} />
    <View style={styles.rosterContent}>
      <Skeleton width="60%" height={18} borderRadius={6} />
      <Skeleton width="40%" height={14} borderRadius={6} />
      <View style={styles.chipRow}>
        <Skeleton width={70} height={24} borderRadius={999} />
        <Skeleton width={90} height={24} borderRadius={999} />
      </View>
    </View>
  </View>
);

export const SkeletonClassCard: React.FC = () => (
  <View style={styles.classCard}>
    <View style={styles.classHeader}>
      <Skeleton width="60%" height={22} borderRadius={8} />
      <Skeleton width={80} height={22} borderRadius={999} />
    </View>
    <View style={styles.classProgress}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <Skeleton width="80%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#F3F4F6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    gap: 12,
  },
  cardTitle: {
    alignSelf: 'flex-start',
  },
  cardSubtitle: {
    alignSelf: 'flex-start',
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rosterContent: {
    flex: 1,
    gap: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    gap: 16,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});