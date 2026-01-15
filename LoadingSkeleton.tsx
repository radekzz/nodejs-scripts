import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import type { ViewStyle, DimensionValue } from 'react-native';
import { View, Animated, StyleSheet } from 'react-native';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

/*
Usage:
<SkeletonCircle size={60} />
<Skeleton width="70%" height={20} style={{ marginTop: 12 }} />
    */

// Skeleton component with shimmer animation
const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 20, borderRadius = 6, style }) => {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [translateX]);

  const animatedStyle = {
    transform: [
      {
        translateX: translateX.interpolate({
          inputRange: [-1, 1],
          outputRange: [-350, 350],
        }),
      },
    ],
  };

  return (
    <View
      style={[
        styles.skeleton,
        // eslint-disable-next-line react-native/no-inline-styles
        {
          width,
          height,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerContainer, animatedStyle]}>
        <LinearGradient
          colors={['#C0C0C0', '#D8D8D8', '#C0C0C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

// Circular skeleton (for avatar)
const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size = 40, style }) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#C0C0C0',
  },
  shimmerContainer: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    width: 350,
    height: '100%',
  },
});

export { Skeleton, SkeletonCircle };

export type { SkeletonProps, SkeletonCircleProps };
