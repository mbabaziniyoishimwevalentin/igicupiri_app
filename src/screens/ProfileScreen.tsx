import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthTextInput from '../components/AuthTextInput';

const BLUE = '#2196F3';

export default function ProfileScreen({ navigation }: any) {
  const { user, updateProfile, changePassword, logout, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    department: user?.department || '',
    course: user?.course || '',
    year: user?.year || '',
    studentId: user?.studentId || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleProfileUpdate = async () => {
    try {
      const response = await updateProfile(profileData);
      
      if (response.success) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.oldPassword) {
      newErrors.oldPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await changePassword(passwordData.oldPassword, passwordData.newPassword);
      
      if (response.success) {
        setIsChangingPassword(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setErrors({});
        Alert.alert('Success', 'Password changed successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation?.navigate?.('Login');
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation?.navigate?.('Login')}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <AuthTextInput
            leftIcon="person-outline"
            placeholder="Full Name"
            value={profileData.fullName}
            onChangeText={(value) => setProfileData(prev => ({ ...prev, fullName: value }))}
            editable={isEditing && !isLoading}
            style={styles.input}
          />

          <AuthTextInput
            leftIcon="mail-outline"
            placeholder="Email"
            value={profileData.email}
            onChangeText={(value) => setProfileData(prev => ({ ...prev, email: value }))}
            editable={false} // Email should not be editable
            style={[styles.input, styles.disabledInput]}
          />

          {user.role === 'student' && (
            <AuthTextInput
              leftIcon="information-circle-outline"
              placeholder="Student ID"
              value={profileData.studentId}
              onChangeText={(value) => setProfileData(prev => ({ ...prev, studentId: value }))}
              editable={isEditing && !isLoading}
              style={styles.input}
            />
          )}

          <AuthTextInput
            leftIcon="business-outline"
            placeholder="Department"
            value={profileData.department}
            onChangeText={(value) => setProfileData(prev => ({ ...prev, department: value }))}
            editable={isEditing && !isLoading}
            style={styles.input}
          />

          <AuthTextInput
            leftIcon="book-outline"
            placeholder="Course"
            value={profileData.course}
            onChangeText={(value) => setProfileData(prev => ({ ...prev, course: value }))}
            editable={isEditing && !isLoading}
            style={styles.input}
          />

          {user.role === 'student' && (
            <AuthTextInput
              leftIcon="calendar-outline"
              placeholder="Year"
              value={profileData.year}
              onChangeText={(value) => setProfileData(prev => ({ ...prev, year: value }))}
              editable={isEditing && !isLoading}
              style={styles.input}
            />
          )}

          {isEditing && (
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleProfileUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Password Change Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Security</Text>
            <TouchableOpacity 
              style={styles.changePasswordButton}
              onPress={() => setIsChangingPassword(!isChangingPassword)}
            >
              <Text style={styles.changePasswordText}>
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>

          {isChangingPassword && (
            <View style={styles.passwordForm}>
              <AuthTextInput
                leftIcon="lock-closed-outline"
                placeholder="Current Password"
                secureTextEntry
                value={passwordData.oldPassword}
                onChangeText={(value) => {
                  setPasswordData(prev => ({ ...prev, oldPassword: value }));
                  if (errors.oldPassword) {
                    setErrors(prev => ({ ...prev, oldPassword: '' }));
                  }
                }}
                style={[styles.input, errors.oldPassword && styles.inputError]}
                editable={!isLoading}
              />
              {errors.oldPassword && <Text style={styles.errorText}>{errors.oldPassword}</Text>}

              <AuthTextInput
                leftIcon="lock-closed-outline"
                placeholder="New Password"
                secureTextEntry
                value={passwordData.newPassword}
                onChangeText={(value) => {
                  setPasswordData(prev => ({ ...prev, newPassword: value }));
                  if (errors.newPassword) {
                    setErrors(prev => ({ ...prev, newPassword: '' }));
                  }
                }}
                style={[styles.input, errors.newPassword && styles.inputError]}
                editable={!isLoading}
              />
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

              <AuthTextInput
                leftIcon="lock-closed-outline"
                placeholder="Confirm New Password"
                secureTextEntry
                value={passwordData.confirmPassword}
                onChangeText={(value) => {
                  setPasswordData(prev => ({ ...prev, confirmPassword: value }));
                  if (errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                editable={!isLoading}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handlePasswordChange}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout Section */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BLUE,
  },
  editButtonText: {
    color: BLUE,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '600',
    color: BLUE,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginVertical: 8,
  },
  disabledInput: {
    opacity: 0.6,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  passwordForm: {
    marginTop: 16,
  },
  button: {
    backgroundColor: BLUE,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  changePasswordText: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});