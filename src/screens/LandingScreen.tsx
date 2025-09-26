

import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Platform,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#2196F3';
const BG_IMAGE = require('../../assets/alexander-grey-tn57JI3CewI-unsplash.jpg'); // Corrected path: image should be in assets/


export default function LandingScreen({ navigation }: any) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.centeredContent}>
        <Text style={styles.appName}>IGICUPURI</Text>
        <View style={styles.logoWrapper}>
          <View style={styles.igCircle}>
            <Text style={styles.igText}>IG</Text>
          </View>
        </View>
        <Text style={styles.headline}>
          Access Past Papers
          {Platform.OS === 'web' ? '' : '\n'}
          in One Place!
        </Text>
        <Text style={styles.subtitle}>
          Welcome to IGICUPURI, your gateway to Mount Kigali University past examination papers. Browse, download, and revise anytime.
        </Text>
      </View>
      <View style={styles.bottomButtonWrap}>
        <TouchableOpacity
          style={styles.getStartedBtn}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate?.('Login')}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  logoWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e7ef',
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  igCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
  },
  igText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 1,
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: '#18181b',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,27,0.60)',
    zIndex: 1,
  },
  centeredContent: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 24,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e7ef',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headline: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.2,
    lineHeight: 32,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: '#e5e7eb',
    fontSize: 15.5,
    textAlign: 'center',
    marginBottom: 0,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.1,
    maxWidth: 340,
  },
  bottomButtonWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 38,
    zIndex: 2,
  },
  getStartedBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 28,
    paddingVertical: 15,
    paddingHorizontal: 60,
    alignItems: 'center',
    width: '80%',
    maxWidth: 340,
    shadowColor: PRIMARY,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  getStartedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});