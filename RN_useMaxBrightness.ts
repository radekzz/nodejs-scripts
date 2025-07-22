/**
 * Screen brightness utility.
 */

import { useIsFocused, useNavigation } from '@react-navigation/core';
import * as Brightness from 'expo-brightness';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Set screen to max brightness when component is mounted and React Navigation screen is focused.
 * Use: useMaxBrightness();
 * NOTE: Can no longer use the system brightness methods on Android, but that
 * means permissions don't need to be requested: https://github.com/expo/expo/issues/22024
 */
export function useMaxBrightness(disabled: boolean = false) {
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const maxBrightness = async () => {
    if (originalBrightness !== null) return;

    const currentBrightness = await Brightness.getBrightnessAsync();
    setOriginalBrightness(currentBrightness);

    await Brightness.setBrightnessAsync(1);
  };

  const resetBrightness = async () => {
    if (originalBrightness === null) return;

    if (Platform.OS === 'android') {
      Brightness.restoreSystemBrightnessAsync();
    } else {
      Brightness.setBrightnessAsync(originalBrightness);
    }

    setOriginalBrightness(null);
  };

  useEffect(() => {
    if (disabled) {
      if (originalBrightness !== null) resetBrightness();

      return;
    }

    if (isFocused) {
      maxBrightness();
    } else {
      resetBrightness();
    }

    // Cleanup resets brightness to original value when component is unmounted.
    return () => {
      resetBrightness();
    };
  }, [disabled, isFocused]);

  // 🟡 Extra: reset při navigaci zpět (goBack, gesture, hardware)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      resetBrightness();
    });

    return unsubscribe;
  }, [navigation, originalBrightness]);
}

export default useMaxBrightness;
