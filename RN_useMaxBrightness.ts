/**
 * Set screen to max brightness when component is mounted and React Navigation screen is focused.
 * Use: useMaxBrightness();
 * NOTE: Can no longer use the system brightness methods on Android, but that
 * means permissions don't need to be requested: https://github.com/expo/expo/issues/22024
 */
import { useIsFocused, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

type Options = { enabled?: boolean };

export function useMaxBrightness({ enabled = false }: Options = {}) {
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  // saved values
  const wasUsingSystemRef = useRef<boolean | null>(null); // Android: is app was using system brightness
  const savedAppBrightnessRef = useRef<number | null>(null); // saved app brightness (when not system)
  const readyRef = useRef<boolean>(false); // to prevent overlapping sequences

  const ensureAvailable = useCallback(async () => {
    try {
      return (await Brightness.isAvailableAsync?.()) ?? Platform.OS !== 'web';
    } catch {
      return false;
    }
  }, []);

  const enableMax = useCallback(async () => {
    if (readyRef.current) return; // už zapnuto

    if (!(await ensureAvailable())) return;

    // 1) Check if app was using system brightness (Android)
    let wasUsingSystem = false;

    if (Platform.OS === 'android' && typeof Brightness.isUsingSystemBrightnessAsync === 'function') {
      try {
        wasUsingSystem = await Brightness.isUsingSystemBrightnessAsync();
      } catch {
        wasUsingSystem = false;
      }
    }
    wasUsingSystemRef.current = wasUsingSystem;

    // 2) Save app brightness only if it was NOT system
    if (!wasUsingSystem && typeof Brightness.getBrightnessAsync === 'function') {
      try {
        savedAppBrightnessRef.current = await Brightness.getBrightnessAsync();
      } catch {
        savedAppBrightnessRef.current = null;
      }
    } else {
      savedAppBrightnessRef.current = null;
    }

    // 3) Set 100% brightness
    await Brightness.setBrightnessAsync?.(1);
    readyRef.current = true;
  }, [ensureAvailable]);

  const reset = useCallback(async () => {
    if (!(await ensureAvailable())) return;

    // nothing to return
    if (!readyRef.current) return;

    try {
      if (Platform.OS === 'android' && wasUsingSystemRef.current) {
        // originally used system brightness ⇒ restore system mode
        await Brightness.restoreSystemBrightnessAsync?.();
      } else {
        // app brightness ⇒ return saved value
        const value = savedAppBrightnessRef.current;

        if (value != null) {
          await Brightness.setBrightnessAsync?.(value);
        }
      }
    } finally {
      // clear saved values
      wasUsingSystemRef.current = null;
      savedAppBrightnessRef.current = null;
      readyRef.current = false;
    }
  }, [ensureAvailable]);

  // set max brightness on screen focus if enabled
  useEffect(() => {
    if (isFocused && enabled) {
      enableMax();
    } else {
      reset();
    }

    return () => {
      reset();
    };
  }, [enabled, isFocused, enableMax, reset]);

  // reset when navigating away
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      reset();
    });

    return unsub;
  }, [navigation, reset]);

  // reset when BLUR from screen (without unmount), e.g. switch tab
  useFocusEffect(
    useCallback(() => {
      return () => {
        reset();
      };
    }, [reset]),
  );
}

export default useMaxBrightness;
