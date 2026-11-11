import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';

import type { LocalImage } from '@/data/api';

/** Most photos a patient can send in one message (the database allows 10). */
const MAX_PHOTOS = 10;
/** JPEG quality: keeps photos of documents and teeth legible at a fraction of the size. */
const QUALITY = 0.7;

type Source = 'library' | 'camera';

/** Native action sheet: "Choose from Library" / "Take Photo". Resolves to null if cancelled. */
function chooseSource(): Promise<Source | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Choose from Library', 'Take Photo', 'Cancel'], cancelButtonIndex: 2 },
        (index) => resolve(index === 0 ? 'library' : index === 1 ? 'camera' : null),
      );
    } else {
      Alert.alert('Add photo', undefined, [
        { text: 'Choose from Library', onPress: () => resolve('library') },
        { text: 'Take Photo', onPress: () => resolve('camera') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

function toLocalImages(result: ImagePicker.ImagePickerResult): LocalImage[] | null {
  if (result.canceled) return null;
  return result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }));
}

/** Asks where to get photos from, then opens the system picker or camera. */
export async function pickChatPhotos(): Promise<LocalImage[] | null> {
  const source = await chooseSource();
  if (!source) return null;

  if (source === 'library') {
    // The iOS photo picker runs out of process and needs no permission.
    return toLocalImages(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS,
        quality: QUALITY,
      }),
    );
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera access is off', 'Allow camera access in Settings to take a photo for the clinic.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    return null;
  }
  try {
    return toLocalImages(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITY }));
  } catch {
    // e.g. the iOS Simulator has no camera.
    Alert.alert('Camera unavailable', 'Choose a photo from your library instead.');
    return null;
  }
}
