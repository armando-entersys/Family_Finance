import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';

interface ReceiptScannerProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onCapture,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Handle camera permission
  if (!permission) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-white">Cargando camara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Permiso de Camara
        </Text>
        <Text className="text-gray-400 text-center mt-2 mb-6">
          Necesitamos acceso a la camara para escanear recibos
        </Text>
        <Button
          title="Permitir Camara"
          onPress={requestPermission}
          className="w-full"
        />
        <Button
          title="Cancelar"
          variant="ghost"
          onPress={onClose}
          className="w-full mt-2"
        />
      </View>
    );
  }

  // Take photo
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: Platform.OS === 'android',
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo capturar la imagen');
      console.error('Camera capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Pick from gallery
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onCapture(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
      console.error('Gallery picker error:', error);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
      >
        {/* Overlay */}
        <View className="flex-1">
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-semibold text-lg">Escanear Recibo</Text>
            <View className="w-10" />
          </View>

          {/* Scan Frame */}
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-full aspect-[3/4] border-2 border-white/50 rounded-2xl">
              {/* Corner markers */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-xl" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-xl" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-xl" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-xl" />
            </View>
            <Text className="text-white/70 text-center mt-4">
              Alinea el recibo dentro del marco
            </Text>
          </View>

          {/* Bottom Controls */}
          <View className="px-6 pb-10">
            <View className="flex-row items-center justify-around">
              {/* Gallery Button */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                className="w-14 h-14 rounded-full bg-white/20 items-center justify-center"
              >
                <Ionicons name="images-outline" size={28} color="white" />
              </TouchableOpacity>

              {/* Capture Button */}
              <TouchableOpacity
                onPress={handleCapture}
                disabled={isCapturing}
                className="w-20 h-20 rounded-full bg-white items-center justify-center"
              >
                <View className={`w-16 h-16 rounded-full border-4 border-gray-800 ${isCapturing ? 'bg-gray-400' : 'bg-white'}`} />
              </TouchableOpacity>

              {/* Placeholder for symmetry */}
              <View className="w-14 h-14" />
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
};
