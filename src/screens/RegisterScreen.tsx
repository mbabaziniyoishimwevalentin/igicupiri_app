import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import AuthTextInput from '../components/AuthTextInput';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../contexts/AuthContext';

const BLUE = '#2196F3';

export default function RegisterScreen({ navigation }: any) {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'lecturer',
    studentId: '',
    department: '',
    course: '',
    year: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'student') {
      if (!formData.studentId.trim()) {
        newErrors.studentId = 'Student ID is required for students';
      }
      if (!formData.course.trim()) {
        newErrors.course = 'Course is required for students';
      }
      if (!formData.year.trim()) {
        newErrors.year = 'Year is required for students';
      }
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const response = await register(formData);
      
      if (response.success && response.user) {
        Alert.alert(
          'Registration Successful', 
          `Welcome to IGICUPURI, ${response.user.fullName}!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate based on user role
                switch (response.user!.role) {
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
                    navigation?.navigate?.('Home');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', response.message || 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()}>
            {/* Back button area */}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create{"\n"}Account</Text>
        </View>

        <View style={styles.content}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <AuthTextInput 
              leftIcon="person-outline" 
              placeholder="Full name" 
              value={formData.fullName} 
              onChangeText={(value) => updateFormData('fullName', value)}
              style={[errors.fullName && styles.inputError]}
              editable={!isLoading}
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <AuthTextInput 
              leftIcon="mail-outline" 
              placeholder="Email" 
              keyboardType="email-address" 
              autoCapitalize="none" 
              value={formData.email} 
              onChangeText={(value) => updateFormData('email', value)}
              style={[errors.email && styles.inputError]}
              editable={!isLoading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>I am a:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity 
                onPress={() => updateFormData('role', 'student')} 
                style={[
                  styles.roleButton, 
                  formData.role === 'student' && styles.roleButtonActive
                ]}
                disabled={isLoading}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'student' && styles.roleButtonTextActive
                ]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => updateFormData('role', 'lecturer')} 
                style={[
                  styles.roleButton,
                  formData.role === 'lecturer' && styles.roleButtonActive
                ]}
                disabled={isLoading}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'lecturer' && styles.roleButtonTextActive
                ]}>Lecturer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Student ID (only for students) */}
          {formData.role === 'student' && (
            <View style={styles.inputContainer}>
              <AuthTextInput 
                leftIcon="information-circle-outline" 
                placeholder="Student ID" 
                value={formData.studentId} 
                onChangeText={(value) => updateFormData('studentId', value)}
                style={[errors.studentId && styles.inputError]}
                editable={!isLoading}
              />
              {errors.studentId && <Text style={styles.errorText}>{errors.studentId}</Text>}
            </View>
          )}

          {/* Department */}
          <View style={styles.inputContainer}>
            <AuthTextInput 
              leftIcon="business-outline" 
              placeholder="Department (e.g., School of Computing)" 
              value={formData.department} 
              onChangeText={(value) => updateFormData('department', value)}
              style={[errors.department && styles.inputError]}
              editable={!isLoading}
            />
            {errors.department && <Text style={styles.errorText}>{errors.department}</Text>}
          </View>

          {/* Course */}
          <View style={styles.inputContainer}>
            <AuthTextInput 
              leftIcon="book-outline" 
              placeholder="Course (e.g., Computer Science)" 
              value={formData.course} 
              onChangeText={(value) => updateFormData('course', value)}
              style={[errors.course && styles.inputError]}
              editable={!isLoading}
            />
            {errors.course && <Text style={styles.errorText}>{errors.course}</Text>}
          </View>

          {/* Year (only for students) */}
          {formData.role === 'student' && (
            <View style={styles.inputContainer}>
              <AuthTextInput 
                leftIcon="calendar-outline" 
                placeholder="Year (e.g., 3rd Year)" 
                value={formData.year} 
                onChangeText={(value) => updateFormData('year', value)}
                style={[errors.year && styles.inputError]}
                editable={!isLoading}
              />
              {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
            </View>
          )}

          {/* Password */}
          <View style={styles.inputContainer}>
            <AuthTextInput 
              leftIcon="lock-closed-outline" 
              placeholder="Password" 
              secureTextEntry 
              secureToggle 
              value={formData.password} 
              onChangeText={(value) => updateFormData('password', value)}
              style={[errors.password && styles.inputError]}
              editable={!isLoading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <AuthTextInput 
              leftIcon="lock-closed-outline" 
              placeholder="Confirm password" 
              secureTextEntry 
              secureToggle 
              value={formData.confirmPassword} 
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              style={[errors.confirmPassword && styles.inputError]}
              editable={!isLoading}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={isLoading ? undefined : onRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity 
            onPress={() => navigation?.navigate?.('Login')} 
            style={styles.backToLogin}
            disabled={isLoading}
          >
            <Text style={styles.backToLoginText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
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
    paddingTop: 24,
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
    marginVertical: 4,
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
  roleContainer: {
    marginVertical: 8,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    borderColor: BLUE,
    backgroundColor: BLUE,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  registerButton: {
    backgroundColor: BLUE,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  registerButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLogin: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
  backToLoginText: {
    color: BLUE,
    fontSize: 14,
    fontWeight: '500',
  },
});