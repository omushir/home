import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  useWindowDimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SQLite from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'react-native-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import * as Animatable from 'react-native-animatable';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const { width, height } = Dimensions.get('window');

// Add responsive scaling utility
const scale = (size: number) => {
  const baseWidth = 375; // Base width (iPhone X)
  const scaleFactor = Math.min(width / baseWidth, 1.3); // Cap scaling at 1.3x
  return size * scaleFactor;
};

// Enhanced futuristic color palette with holographic accents
const colors = {
  light: {
    primary: '#FFFFFF',       // Pure white
    secondary: '#F0F4F8',     // Softer, warmer white
    tertiary: '#E2E8F0',      // Light gray with blue undertone
  },
  dark: {
    primary: '#334155',       // Lighter navy
    secondary: '#475569',     // Medium slate
    tertiary: '#64748B',      // Soft blue-gray
  },
  accent: {
    primary: '#60A5FA',       // Lighter blue
    secondary: '#38BDF8',     // Bright sky blue
    tertiary: '#A78BFA',      // Soft purple
    quaternary: '#2DD4BF',    // Bright teal
    glow: 'rgba(56, 189, 248, 0.4)',  // Lighter glow
    neon: '#7DD3FC',         // Soft neon blue
  },
  text: {
    primary: '#334155',       // Softer dark text
    secondary: '#475569',     // Medium contrast text
    light: '#F8FAFC',        // Bright white text
    muted: '#94A3B8',        // Subtle gray text
  },
  status: {
    success: '#4ADE80',      // Lighter green
    error: '#FB7185',        // Soft red
    warning: '#FBBF24',      // Warm yellow
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.9)',   // More transparent white
    dark: 'rgba(51, 65, 85, 0.75)',           // Lighter dark glass
    border: 'rgba(226, 232, 240, 0.6)',       // Softer border
    highlight: 'rgba(255, 255, 255, 0.98)',   // Bright highlight
  },
  gradient: {
    primary: ['#60A5FA', '#3B82F6'],    // Lighter blue gradient
    secondary: ['#38BDF8', '#0EA5E9'],  // Sky blue gradient
    accent: ['#A78BFA', '#8B5CF6'],     // Soft purple gradient
  },
  holographic: {
    primary: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7), rgba(56, 189, 248, 0.7), rgba(167, 139, 250, 0.7))',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
  }
};

const LoginPage = (): JSX.Element => {
  const [selectedPB, setSelectedPB] = useState('');
  const [password, setPassword] = useState('');
  const [pbNumbers, setPbNumbers] = useState<{ pb: string; role: string }[]>([]);
  const [currentRole, setCurrentRole] = useState<'Inspector' | 'Operator' | 'Shop Supervisor'>('Operator');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  // Add new state variables for interactive elements
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [activeInput, setActiveInput] = useState<'pb' | 'password' | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        const sourcePath = `${RNFS.DownloadDirectoryPath}/App/AeroPara.db`;
        const db = await SQLite.openDatabase({
          name: sourcePath,
          location: 'default'
        });

        // Fixed query for Shop Supervisor
        db.transaction(tx => {
          const roleQuery = currentRole === 'Inspector' 
            ? "SELECT PBNumber as pb, Role as role FROM irs_employees WHERE Role = 'Inspector'"
            : currentRole === 'Operator'
            ? "SELECT PBNumber as pb, Role as role FROM irs_employees WHERE Role = 'Operator'"
            : "SELECT PBNumber as pb, Role as role FROM irs_employees WHERE Role = 'Shop Supervisor'";

          tx.executeSql(
            roleQuery,
            [],
            (tx, results) => {
              const len = results.rows.length;
              const numbers: { pb: string; role: string }[] = [];
              for (let i = 0; i < len; i++) {
                const item = results.rows.item(i);
                numbers.push({ pb: item.pb, role: item.role });
              }
              setPbNumbers(numbers);
            },
            error => {
              console.error('Error fetching PB numbers:', error);
              return false;
            }
          );
        });
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    initializeDB();
  }, [currentRole]);

  const handleLogin = async () => {
    if (!selectedPB || !password) {
      Alert.alert('Error', 'Please enter both PB Number and password');
      return;
    }

    setIsLoading(true);
    try {
      const sourcePath = `${RNFS.DownloadDirectoryPath}/App/AeroPara.db`;
      const db = await SQLite.openDatabase({
        name: sourcePath,
        location: 'default'
      });

      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM irs_employees WHERE PBNumber = ? AND Password = ? AND Role = ?',
            [selectedPB, password, currentRole],
            async (tx, results) => {
              if (results.rows.length > 0) {
                const user = results.rows.item(0);
                console.log('Login successful. Role:', user.Role);
                await login(selectedPB.toString(), password);

                if (currentRole === 'Operator') {
                  setCurrentRole('Shop Supervisor');
                  setSelectedPB('');
                  setPassword('');
                  Alert.alert('Success', 'Operator verified. Please login as Shop Supervisor.');
                } else if (currentRole === 'Shop Supervisor') {
                  setCurrentRole('Inspector');
                  setSelectedPB('');
                  setPassword('');
                  Alert.alert('Success', 'Shop Supervisor verified. Please login as Inspector.');
                } else {
                  // All roles verified, navigate to Home
                  navigation.navigate('Home' as never);
                }
              } else {
                Alert.alert('Error', 'Invalid credentials');
              }
              resolve();
            },
            (_, error) => {
              console.error('Error during login:', error);
              Alert.alert('Error', 'Login failed. Please try again.');
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar hidden={true} />
      <LinearGradient
        colors={[colors.light.primary, colors.light.secondary, colors.light.tertiary]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.backgroundGradient}
      >
        {/* Futuristic background elements */}
        <View style={styles.backgroundElements}>
          <Animatable.View 
            animation="fadeIn" 
            duration={1500} 
            style={[styles.glowCircle, { top: '15%', left: '10%', backgroundColor: colors.accent.primary }]} 
          />
          <Animatable.View 
            animation="fadeIn" 
            duration={1800} 
            style={[styles.glowCircle, { bottom: '20%', right: '15%', backgroundColor: colors.accent.secondary }]} 
          />
          <Animatable.View 
            animation="fadeIn" 
            duration={2000} 
            style={[styles.glowCircle, { top: '50%', right: '30%', backgroundColor: colors.accent.tertiary }]} 
          />
          
          {/* Dynamic grid with animated particles */}
          <Animatable.View animation="fadeIn" duration={2000} style={styles.gridOverlay} />
          
          {/* Floating particles */}
          {Array.from({ length: 12 }).map((_, index) => (
            <Animatable.View
              key={index}
              animation={{
                0: { opacity: 0, translateY: 0 },
                0.5: { opacity: 0.5 },
                1: { opacity: 0, translateY: -20 }
              }}
              duration={3000 + index * 500}
              iterationCount="infinite"
              direction="alternate"
              easing="ease-in-out"
              style={[
                styles.floatingParticle,
                {
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  backgroundColor: [
                    colors.accent.primary, colors.accent.secondary, 
                    colors.accent.tertiary, colors.accent.quaternary
                  ][index % 4],
                  width: scale(4 + Math.random() * 4),
                  height: scale(4 + Math.random() * 4),
                }
              ]}
            />
          ))}
          
          {/* Animated light beams */}
          <Animatable.View 
            animation={{
              0: { opacity: 0 },
              0.5: { opacity: 0.1 },
              1: { opacity: 0 }
            }}
            iterationCount="infinite"
            duration={5000}
            style={styles.lightBeam1}
          />
          <Animatable.View 
            animation={{
              0: { opacity: 0 },
              0.5: { opacity: 0.1 },
              1: { opacity: 0 }
            }}
            iterationCount="infinite"
            duration={7000}
            style={styles.lightBeam2}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={[styles.mainContainer, isLandscape && styles.landscapeContainer]}>
            <Animatable.View 
              animation="fadeIn" 
              duration={1200}
              style={isLandscape ? styles.landscapeContent : styles.portraitContent}
            >
              {/* Left side decoration - visible in landscape mode */}
              {isLandscape && (
                <Animatable.View 
                  animation="fadeInLeft" 
                  duration={1200} 
                  style={styles.decorationContainer}
                >
                  <View style={styles.decorationInnerContainer}>
                    <LinearGradient
                      colors={[colors.accent.primary, colors.accent.secondary]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.decorationGradient}
                    >
                      {/* Holographic ring effect */}
                      <Animatable.View
                        animation={{
                          0: { transform: [{ rotate: '0deg' }] },
                          1: { transform: [{ rotate: '360deg' }] }
                        }}
                        iterationCount="infinite"
                        duration={20000}
                        easing="linear"
                        style={styles.holographicRing}
                      />
                      
                      <Animatable.View 
                        animation="pulse" 
                        iterationCount="infinite" 
                        duration={3000}
                        style={styles.logoGlow}
                      >
                        <Image source={require('../assets/Tejas_MKII.png')} style={styles.logoImage} />
                      </Animatable.View>
                      
                      {/* Dynamic text effect */}
                      <Animatable.View style={styles.titleContainer}>
                        <Animatable.Text 
                          animation="fadeIn"
                          duration={1500}
                          style={styles.decorationTitle}
                        >
                          IRS
                        </Animatable.Text>
                        
                        {/* Animated underline */}
                        <Animatable.View
                          animation={{
                            0: { width: 0 },
                            1: { width: scale(120) }
                          }}
                          duration={1000}
                          delay={1500}
                          style={styles.titleUnderline}
                        />
                      </Animatable.View>
                      
                      <Animatable.Text 
                        animation="fadeIn"
                        delay={300}
                        duration={1500}
                        style={styles.decorationSubtitle}
                      >
                        INSPECTION RECORD FORM SYSTEM
                      </Animatable.Text>
                      
                      {/* Interactive version indicator */}
                      <View style={styles.versionTag}>
                        <View style={styles.versionDot} />
                        <Text style={styles.versionText}>v2.0</Text>
                      </View>
                    </LinearGradient>
                  </View>
                </Animatable.View>
              )}

              {/* Login form container */}
              <Animatable.View 
                animation={isLandscape ? "fadeInRight" : "fadeInUp"} 
                duration={1000}
                style={isLandscape ? styles.landscapeFormWrapper : styles.portraitFormWrapper}
              >
                {/* App logo and title - Visible only in portrait mode */}
                {!isLandscape && (
                  <Animatable.View 
                    animation="fadeInDown" 
                    duration={1000}
                    style={styles.headerContainer}
                  >
                    <View style={styles.logoOuterContainer}>
                      <LinearGradient
                        colors={[colors.accent.primary, colors.accent.secondary]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.logoBackground}
                      >
                        {/* Rotating ring for logo */}
                        <Animatable.View
                          animation={{
                            0: { transform: [{ rotate: '0deg' }] },
                            1: { transform: [{ rotate: '360deg' }] }
                          }}
                          iterationCount="infinite"
                          duration={20000}
                          easing="linear"
                          style={[styles.holographicRing, { width: scale(110), height: scale(110) }]}
                        />
                        
                        <Animatable.View
                          animation="pulse"
                          iterationCount="infinite"
                          duration={3000}
                          style={styles.logoGlow}
                        >
                          <Image source={require('../assets/HALHalf.png')} style={styles.logoImage} />
                        </Animatable.View>
                      </LinearGradient>
                    </View>
                    
                    <Text style={styles.headerTitle}>IRS SYSTEM</Text>
                    
                    {/* Shimmer effect on subtitle */}
                    <View style={styles.shimmerContainer}>
                      <Text style={styles.headerSubtitle}>INSPECTION RECORD FORM SYSTEM</Text>
                      <Animatable.View
                        animation={{
                          0: { translateX: -scale(250) },
                          1: { translateX: scale(250) }
                        }}
                        iterationCount="infinite"
                        duration={3000}
                        style={styles.shimmerEffect}
                      />
                    </View>
                  </Animatable.View>
                )}

                {/* Login Form */}
                <Animatable.View 
                  animation="fadeIn" 
                  duration={1000} 
                  delay={300}
                  style={styles.formWrapper}
                >
                  <View style={styles.formContainer}>
                    {/* Status line indicator */}
                    <View style={styles.statusLineContainer}>
                      <View style={[
                        styles.statusLine, 
                        styles.statusLineActive,
                        { flex: currentRole === 'Operator' ? 1/3 : 
                           currentRole === 'Shop Supervisor' ? 2/3 : 3/3 }
                      ]} />
                    </View>
                    
                    <View style={styles.roleIndicator}>
                      <LinearGradient
                        colors={[colors.accent.primary, colors.accent.secondary]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={styles.roleTag}
                      >
                        <Text style={styles.roleText}>{currentRole.toUpperCase()} LOGIN</Text>
                      </LinearGradient>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        PB NUMBER
                        <View style={styles.requiredDot} />
                      </Text>
                      <Animatable.View 
                        animation={activeInput === 'pb' ? 'pulse' : undefined}
                        duration={300}
                        style={[
                          styles.inputContainer,
                          activeInput === 'pb' && styles.inputContainerActive
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name="badge-account-outline" 
                          size={scale(20)} 
                          color={activeInput === 'pb' ? colors.accent.neon : colors.accent.primary} 
                          style={styles.inputIcon}
                        />
                        <View style={styles.pickerWrapper}>
                          <Picker
                            style={styles.picker}
                            selectedValue={selectedPB}
                            onValueChange={(itemValue) => setSelectedPB(itemValue)}
                            dropdownIconColor={colors.accent.primary}
                            onFocus={() => setActiveInput('pb')}
                            onBlur={() => setActiveInput(null)}
                          >
                            <Picker.Item 
                              label={`SELECT ${currentRole.toUpperCase()} PB NUMBER`} 
                              value="" 
                              style={styles.pickerItem}
                              color={colors.text.muted}
                            />
                            {pbNumbers.map((pb) => (
                              <Picker.Item 
                                key={pb.pb} 
                                label={pb.pb.toString()} 
                                value={pb.pb}
                                style={styles.pickerItem}
                                color={colors.text.primary}
                              />
                            ))}
                          </Picker>
                        </View>
                      </Animatable.View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        PASSWORD
                        <View style={styles.requiredDot} />
                      </Text>
                      <Animatable.View 
                        animation={activeInput === 'password' ? 'pulse' : undefined}
                        duration={300}
                        style={[
                          styles.inputContainer, 
                          activeInput === 'password' && styles.inputContainerActive
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name="lock-outline" 
                          size={scale(20)} 
                          color={activeInput === 'password' ? colors.accent.neon : colors.accent.primary} 
                          style={styles.inputIcon}
                        />
                        <View style={styles.passwordContainer}>
                          <TextInput
                            style={[styles.input, styles.passwordInput]}
                            placeholder="Enter your password"
                            placeholderTextColor={colors.text.muted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            selectionColor={colors.accent.primary}
                            onFocus={() => setActiveInput('password')}
                            onBlur={() => setActiveInput(null)}
                          />
                          <TouchableOpacity 
                            style={styles.passwordToggle}
                            onPress={() => setShowPassword(!showPassword)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons 
                              name={showPassword ? 'eye-off' : 'eye'}
                              size={scale(20)}
                              color={activeInput === 'password' ? colors.accent.neon : colors.accent.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </Animatable.View>
                    </View>

                    <Animatable.View 
                      animation="fadeIn" 
                      delay={600} 
                      duration={800}
                    >
                      <TouchableOpacity
                        style={[
                          styles.loginButton, 
                          isLoading && styles.loginButtonDisabled,
                          isButtonHovered && styles.loginButtonHovered
                        ]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.8}
                        onPressIn={() => setIsButtonHovered(true)}
                        onPressOut={() => setIsButtonHovered(false)}
                      >
                        <LinearGradient
                          colors={isLoading ? 
                            [colors.dark.tertiary, colors.dark.secondary] : 
                            isButtonHovered ?
                            [colors.accent.secondary, colors.accent.primary] :
                            [colors.accent.primary, colors.accent.secondary]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 0}}
                          style={styles.gradientButton}
                        >
                          {isLoading ? (
                            <Animatable.View animation="pulse" iterationCount="infinite">
                              <MaterialCommunityIcons name="loading" size={scale(24)} color={colors.text.light} />
                            </Animatable.View>
                          ) : (
                            <>
                              <MaterialCommunityIcons 
                                name="login" 
                                size={scale(20)} 
                                color={colors.text.light} 
                                style={styles.buttonIcon} 
                              />
                              <Text style={styles.buttonText}>
                                VERIFY CREDENTIALS
                              </Text>
                              
                              {/* Arrow indicator */}
                              <Animatable.View
                                animation={isButtonHovered ? "fadeIn" : "fadeOut"}
                                duration={200}
                                style={styles.buttonArrowContainer}
                              >
                                <MaterialCommunityIcons 
                                  name="chevron-right" 
                                  size={scale(20)} 
                                  color={colors.text.light} 
                                />
                              </Animatable.View>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animatable.View>
                    
                    {/* Security verification badge */}
                    <Animatable.View 
                      animation="fadeIn"
                      delay={800}
                      style={styles.securityBadge}
                    >
                      <MaterialCommunityIcons 
                        name="shield-check-outline" 
                        size={scale(14)} 
                        color={colors.accent.quaternary} 
                      />
                      <Text style={styles.securityText}>SECURE VERIFICATION</Text>
                    </Animatable.View>
                  </View>
                </Animatable.View>
              </Animatable.View>
            </Animatable.View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute',
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    opacity: 0.15,
    filter: 'blur(60px)',
  },
  gridOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  floatingParticle: {
    position: 'absolute',
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    opacity: 0.5,
  },
  lightBeam1: {
    position: 'absolute',
    width: scale(300),
    height: scale(800),
    transform: [{ rotate: '45deg' }],
    backgroundColor: colors.accent.primary,
    top: -scale(200),
    left: scale(100),
    opacity: 0.05,
    borderRadius: scale(150),
  },
  lightBeam2: {
    position: 'absolute',
    width: scale(300),
    height: scale(800),
    transform: [{ rotate: '-45deg' }],
    backgroundColor: colors.accent.secondary,
    bottom: -scale(200),
    right: scale(100),
    opacity: 0.05,
    borderRadius: scale(150),
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: '100%',
  },
  landscapeContainer: {
    flexDirection: 'row',
  },
  portraitContent: {
    width: '100%',
    maxWidth: scale(500),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(16),
  },
  landscapeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: scale(1100),
    height: '100%',
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  decorationContainer: {
    width: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(10),
  },
  decorationInnerContainer: {
    width: '100%',
    borderRadius: scale(28),
    padding: scale(2),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  decorationGradient: {
    borderRadius: scale(26),
    padding: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    aspectRatio: 0.85,
    borderWidth: 1,
    borderColor: colors.glass.border,
    position: 'relative',
    overflow: 'hidden',
  },
  holographicRing: {
    position: 'absolute',
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: colors.accent.primary,
    borderRightColor: colors.accent.secondary,
  },
  logoGlow: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: scale(16),
  },
  titleUnderline: {
    height: scale(2),
    backgroundColor: colors.accent.primary,
    marginTop: scale(5),
  },
  decorationTitle: {
    color: colors.text.light,
    fontSize: scale(40),
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  decorationSubtitle: {
    color: colors.text.light,
    fontSize: scale(12),
    marginTop: scale(8),
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  versionTag: {
    position: 'absolute',
    bottom: scale(15),
    right: scale(15),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: colors.accent.quaternary,
    marginRight: scale(5),
  },
  versionText: {
    color: colors.text.light,
    fontSize: scale(10),
    fontWeight: '600',
  },
  landscapeFormWrapper: {
    width: '55%',
    maxWidth: scale(550),
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  portraitFormWrapper: {
    width: '100%',
    maxWidth: scale(430),
  },
  formWrapper: {
    width: '100%',
  },
  formContainer: {
    width: '100%',
    borderRadius: scale(28),
    padding: scale(24),
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
    position: 'relative',
  },
  statusLineContainer: {
    position: 'absolute',
    top: scale(6),
    left: scale(40),
    right: scale(40),
    height: scale(3),
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    borderRadius: scale(1.5),
    overflow: 'hidden',
  },
  statusLine: {
    height: '100%',
  },
  statusLineActive: {
    backgroundColor: colors.accent.primary,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: scale(24),
    width: '100%',
  },
  logoOuterContainer: {
    padding: scale(3),
    borderRadius: scale(55),
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    marginBottom: scale(14),
  },
  logoBackground: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: scale(24),
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  shimmerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerSubtitle: {
    fontSize: scale(12),
    color: colors.text.secondary,
    marginTop: scale(4),
    letterSpacing: 1.5,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    width: scale(50),
    transform: [{ skewX: '-20deg' }],
  },
  roleIndicator: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  roleTag: {
    paddingHorizontal: scale(24),
    paddingVertical: scale(10),
    borderRadius: scale(50),
    minWidth: scale(180),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    marginRight: scale(8),
  },
  roleText: {
    color: colors.text.light,
    fontSize: scale(14),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  inputGroup: {
    marginBottom: scale(18),
  },
  inputLabel: {
    fontSize: scale(12),
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: scale(8),
    paddingLeft: scale(4),
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    flexDirection: 'row',
    alignItems: 'center',
  },
  requiredDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: colors.accent.secondary,
    marginLeft: scale(4),
    marginTop: scale(-8),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primary,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: colors.light.tertiary,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  inputContainerActive: {
    borderColor: colors.accent.neon,
    shadowColor: colors.accent.neon,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  inputIcon: {
    paddingHorizontal: scale(12),
  },
  pickerWrapper: {
    flex: 1,
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  picker: {
    height: scale(48),
    backgroundColor: 'transparent',
    color: colors.text.primary,
  },
  pickerItem: {
    fontSize: scale(14),
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  input: {
    height: scale(48),
    paddingHorizontal: scale(12),
    fontSize: scale(14),
    color: colors.text.primary,
    flex: 1,
  },
  passwordContainer: {
    position: 'relative',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    borderLeftWidth: 0,
    paddingRight: scale(40),
  },
  passwordToggle: {
    position: 'absolute',
    right: scale(12),
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(8),
  },
  loginButton: {
    marginTop: scale(20),
    borderRadius: scale(16),
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonHovered: {
    transform: [{ translateY: -scale(2) }],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: scale(16),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonIcon: {
    marginRight: scale(8),
  },
  buttonText: {
    color: colors.text.light,
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  buttonArrowContainer: {
    position: 'absolute',
    right: scale(16),
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(12),
  },
  securityText: {
    color: colors.text.muted,
    fontSize: scale(10),
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: scale(5),
  },
  logoImage: {
    width: scale(150),
    height: scale(150),
    resizeMode: 'contain',
  },
});

export default LoginPage;
