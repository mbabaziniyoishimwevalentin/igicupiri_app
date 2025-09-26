import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Dimensions, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import AuthTextInput from '../components/AuthTextInput';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const BLUE = '#2196F3';

export default function LoginScreen({ navigation }: any) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onLogin = async () => {
    console.log('🔄 Login button pressed');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password.length);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    try {
      console.log('🚀 Attempting login...');
      const response = await login({ email: email.trim(), password });
      console.log('📥 Login response:', response);
      
      if (response.success && response.user) {
        console.log('✅ Login successful, navigating...');
        // Navigate based on user role
        switch (response.user.role) {
          case 'admin':
            navigation?.navigate?.('Admin');
            break;
          case 'lecturer':
            navigation?.navigate?.('Lecturer');
            break;
          case 'student':
            navigation?.navigate?.('Student');
            break;
          default:
            navigation?.navigate?.('Student');
        }
        
        Alert.alert('Success', `Welcome back, ${response.user.fullName}!`);
      } else {
        console.log('❌ Login failed:', response.message);
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.log('💥 Login error:', error);
      Alert.alert('Error', error.message || 'Login failed. Please try again.');
    }
  };

  const handleQuickLogin = (userType: 'admin' | 'lecturer' | 'student') => {
    console.log('🚀 Quick login pressed for:', userType);
    
    const credentials = {
      admin: { email: 'admin@igicupuri.edu', password: 'admin123' },
      lecturer: { email: 'jane.smith@igicupuri.edu', password: 'lecturer123' },
      student: { email: 'john.doe@student.igicupuri.edu', password: 'student123' }
    };

    const cred = credentials[userType];
    console.log('📧 Setting credentials:', cred.email);
    setEmail(cred.email);
    setPassword(cred.password);
    setErrors({});
    
    // Auto-login after setting credentials
    setTimeout(() => {
      console.log('⏰ Auto-login triggered');
      onLogin();
    }, 100);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()}> 
            {/* Back button area (icon could be added) */}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>welcome{"\n"}Again</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <AuthTextInput
              leftIcon="mail-outline"
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              style={[styles.input, errors.email && styles.inputError]}
              editable={!isLoading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <AuthTextInput
              leftIcon="lock-closed-outline"
              placeholder="Password"
              secureTextEntry
              secureToggle
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: undefined }));
                }
              }}
              style={[styles.input, errors.password && styles.inputError]}
              editable={!isLoading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={{ height: 8 }} />
          
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={isLoading ? undefined : onLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.hr} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.hr} />
          </View>

          <PrimaryButton 
            title="Create Account" 
            onPress={() => navigation?.navigate?.('Register')}
            disabled={isLoading}
          />

          {/* Quick Login Demo Section */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Quick Login (Demo):</Text>
            <View style={styles.quickLoginContainer}>
              <TouchableOpacity 
                style={styles.quickLoginButton}
                onPress={() => handleQuickLogin('admin')}
                disabled={isLoading}
              >
                <Text style={styles.quickLoginText}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickLoginButton}
                onPress={() => handleQuickLogin('lecturer')}
                disabled={isLoading}
              >
                <Text style={styles.quickLoginText}>Lecturer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickLoginButton}
                onPress={() => handleQuickLogin('student')}
                disabled={isLoading}
              >
                <Text style={styles.quickLoginText}>Student</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BLUE,
    width: '100%',
    minHeight: 260,
    paddingTop: 48, // Increased from 24 to 48 for more top space
    paddingHorizontal: 24,
    borderBottomLeftRadius: 60,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 32,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  inputContainer: {
    marginVertical: 6,
  },
  input: {
    marginVertical: 0,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: BLUE,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  hr: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  orText: {
    color: '#666',
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  quickLoginButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickLoginText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});