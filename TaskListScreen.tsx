import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Keyboard,
  ToastAndroid,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { debounce } from 'lodash';
import RNFS from 'react-native-fs';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import { launchCamera,  ImagePickerResponse } from 'react-native-image-picker';
import { PermissionsAndroid } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Modal, Image } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

// Improved type definitie                                                          
type RootStackParamList = {
  Home: undefined;
  TaskList: { taskNo: number; dbFile: string ;acNo:string;taskId:number};
  TaskSelection: undefined;
};
// ... existing imports ...

// Modern UI color palette
const theme = {
  colors: {
    primary: '#2563EB',
    secondary: '#3B82F6',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      light: '#94A3B8',
    },
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    accent: {
      blue: '#60A5FA',
      purple: '#A78BFA',
      teal: '#2DD4BF',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: 'rgba(226, 232, 240, 0.6)',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
  }
};

// ... rest of the existing code ...


type TaskListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskList'>;
type TaskListScreenRouteProp = RouteProp<RootStackParamList, 'TaskList'>;

const SIDEBAR_WIDTH = 300;
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

// SQLite.enablePromise(true);

// SQLite.DEBUG(true);
SQLite.enablePromise(true);

interface SQLiteDatabase extends SQLite.SQLiteDatabase { }

interface SQLiteResultSet {
  insertId?: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => any;
    raw: () => any[];
  };
}

interface VoltageInputProps {
  task: TaskItem;
  onStateChange: (transId: number, isValid: boolean) => void;
  setTaskStates: React.Dispatch<React.SetStateAction<TaskStates>>;
  state: TaskState;
  TASK_ID: number;
}

interface ModernLayoutProps {
  children: React.ReactNode;
}

interface MainContentProps {
  children: React.ReactNode;
  isCollapsed: boolean;
}

interface VoltFreqComponentProps {
  task: TaskItem;
  state: TaskState;
  onStateChange: (transId: number, isValid: boolean) => void;
  setTaskStates: React.Dispatch<React.SetStateAction<TaskStates>>;
}

const sourcePath = `${RNFS.DownloadDirectoryPath}/App/AeroPara.db`;

// Types and Interfaces
type TaskStatus = 'UNCHECKED' | 'CHECKED';

type InputType = 'Heading' | 'SubHead' | 'Check' | 'Input' | 'Note' | 'Freq' | 'Volt' | 'VoltFreq' | 'PartSerail' | 'PhaseSeq';

//aerocheckstrans table coloumn data is fetch in this interface 
interface TaskItem {
  TRANS_ID: number;
  Topic_ID?: number;
  Ac_No?: number;
  TASK_ID?:number;
  Check_Name: string;
  Input_Type: InputType;
  Connectors: string | null;
  Pins: string | null;
  Voltage_Required: string | null;
  Voltage_Min: number | null;
  Voltage_Max: number | null;
  UOM: string | null;
  Frequency: string | null;
  Frequency_Min: number | null;
  Frequency_Max: number | null;
  PhaseSequence: string | null;
  Unit_Con_Dest: string | null;
  Part_Sr_No: string | null;
  Caibiration_Status: string | null;
  Remark: string | null;
  CBs_Pressed: string | null;
  Equipment: string | null;
  Pos: string | null;
  Status?: TaskStatus;
  Actual_Voltage: number | null;
  Actual_Frequency: number | null;
  Input_Value?: string | null;
  Updated_At?: string | null;
}

interface TaskState {
  checked: boolean;
  isValid: boolean;
  inputValue: string;
  isEnabled: boolean;
  voltageValue?: string;
  frequencyValue?: string;
  voltageValid?: boolean;
  frequencyValid?: boolean;
  partSrNo?: string;
  calibrationStatus?: string;
  status?: string;
}

interface TaskStates {
  [key: number]: TaskState;
}

interface SQLiteResult {
  rows: {
    length: number;
    item: (index: number) => any;
    raw: () => any[];
  };
  rowsAffected: number;
  insertId?: number;
}

class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Database Manager
// First, define the SQLite types more precisely
interface SQLiteDatabase extends SQLite.SQLiteDatabase { }

interface SQLiteResultSet {
  insertId?: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => any;
    raw: () => any[];
  };
}

// Updated DatabaseManager with fixed types
const DatabaseManager = {
  db: null as SQLiteDatabase | null,
  isConnecting: false,
  connectionPromise: null as Promise<SQLiteDatabase> | null,
  currentDbFile: '',  // Add this to store current dbFile

  setCurrentDbFile(dbFile: string) {  // Add this method
    this.currentDbFile = dbFile;
  },

  async initDatabase(dbFile: string): Promise<void> {
    try {
      console.log('Starting database initialization...');
      console.log('Database file:', dbFile);

      // Database configuration
      const databaseConfig = {
        name: dbFile, // Use the provided dbFile
        location: 'default',
 
      };

      console.log('Database config:', databaseConfig);

      try {
        // Using the correct method to open database
        const db = await SQLite.openDatabase(databaseConfig);
        console.log('Database opened successfully');
        this.db = db;
        this.currentDbFile = dbFile; // Store the current database file

        // Verify connection with a test query
        await new Promise<void>((resolve, reject) => {
          db.transaction(
            tx => {
              tx.executeSql(
                "SELECT name FROM sqlite_master WHERE type='table'",
                [],
                (_, result) => {
                  const tables = [];
                  for (let i = 0; i < result.rows.length; i++) {
                    tables.push(result.rows.item(i));
                  }
                  console.log('Database tables:', tables);
                  resolve();
                },
                (_, error) => {
                  reject(error);
                  return false;
                }
              );
            },
            error => reject(error)
          );
        });

        console.log('Database connection verified');
      } catch (firstAttemptError) {
        console.error('First attempt failed, trying alternative method:', firstAttemptError);

        // Try alternative method
        const db = await SQLite.openDatabase({
          name: sourcePath,
          location: 'default',
          
        });

        this.db = db;
        console.log('Database opened successfully with alternative method');
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new DatabaseError('Failed to initialize database', error);
    }
  },

  // Add proper type checking for database operations
  async updateVoltFreqValues(
    transId: number,
    voltageValue: string,
    frequencyValue: string,
    taskId: number
  ): Promise<void> {
    try {
      await this.updateActualValues(
        transId,
        parseFloat(voltageValue),
        parseFloat(frequencyValue),
        taskId
      );
    } catch (error) {
      console.error('Failed to update volt/freq values:', error);
      throw new DatabaseError('Failed to update volt/freq values', error);
    }
  },
  //load all the heading from the Table where input_type is heading 
async loadHeadings(taskId: number): Promise<TaskItem[]> {
  try {
    const result = await this.executeTransaction(
      'SELECT * FROM aerocheckstrans WHERE Input_Type = "Heading"  AND TASK_ID = ? ORDER BY TRANS_ID ASC ',
      [taskId],
      'Failed to load headings'
    );

    const headings: TaskItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      headings.push(result.rows.item(i));
    }
    return headings;
  } catch (error) {
    console.error('Error loading headings:', error);
    throw error;
  }
},

async loadTasksForHeading(headingId: number, taskId: number): Promise<TaskItem[]> {
  try {
    // Get next heading ID to know where to stop    
    const nextHeadingResult = await this.executeTransaction(
      'SELECT MIN(TRANS_ID) as nextId FROM aerocheckstrans WHERE Input_Type = "Heading" AND TRANS_ID > ? AND TASK_ID = ?',
      [headingId, taskId],
      'Failed to find next heading'
    );
    
    const nextHeadingId = nextHeadingResult.rows.item(0)?.nextId;
    
    let query = 'SELECT * FROM aerocheckstrans WHERE TRANS_ID > ? AND TASK_ID = ?';
    let params = [headingId, taskId];
    
    if (nextHeadingId) {
      query += 'AND TRANS_ID < ? ' ;
      params.push(nextHeadingId);
    }
    
    query += ' ORDER BY TRANS_ID ASC';
    
    const result = await this.executeTransaction(query, params, 'Failed to load tasks for heading');
    
    const tasks: TaskItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const task = result.rows.item(i);
      if (task.Input_Type !== 'Heading') {
        tasks.push(task);
      }
    }
    return tasks;
  } catch (error) {
    console.error('Error loading tasks for heading:', error);
    throw error;
  }
},

  async getConnection(dbFile: string): Promise<SQLiteDatabase> {
    if (this.db) return this.db;

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;

    try {
      if (!this.db) {
        await this.initDatabase(dbFile);
      }

      if (!this.db) {
        throw new DatabaseError('Database initialization failed');
      }

      return this.db;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      console.error('Database connection error:', error);
      throw new DatabaseError(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  },

  // Updated executeTransaction without generic type parameter
  async executeTransaction(
    query: string,
    params: any[],
    errorMessage: string
  ): Promise<SQLiteResultSet> {
    if (!this.db) {
      try {
        await this.initDatabase(this.currentDbFile);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw new DatabaseError('Database initialization failed', error);
      }
    }

    if (!this.db) {
      throw new DatabaseError('No database connection available');
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            query,
            params,
            (_, result) => resolve(result),
            (_, error) => {
              console.error(`SQL Error: ${error.message}`, { query, params });
              reject(new DatabaseError(`${errorMessage}: ${error.message}`, error));
              return false;
            }
          );
        },
        error => {
          console.error(`Transaction Error: ${error.message}`, { query });
          reject(new DatabaseError(`Transaction error: ${error.message}`, error));
        }
      );
    });
  },

  async resetConnection(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
      } catch (error) {
        console.error('Error closing database:', error);
        throw new DatabaseError('Failed to close database connection', error);
      }
    }
    this.db = null;
    this.connectionPromise = null;
    this.isConnecting = false;
  },

  // Updated loadTasks function
  async loadTasks(taskId: number): Promise<TaskItem[]> {
    try {
      const result = await this.executeTransaction(
        'SELECT *, Remark FROM aerocheckstrans ORDER BY TRANS_ID ASC AND TASK_ID = ? AND TASK_ID = ?',
        [taskId],
        'Failed to load tasks'
      );

      const items: TaskItem[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        items.push({
          TRANS_ID: row.TRANS_ID,
          TASK_ID: row.TASK_ID || undefined,
          // Order_No: row.Order_No || undefined,
          Ac_No:row.Ac_No||undefined,
          Check_Name: row.Check_Name,
          Input_Type: row.Input_Type as InputType,
          Connectors: row.Connectors,
          Pins: row.Pins,
          Voltage_Required: row.Voltage_Required,
          Voltage_Min: row.Voltage_Min,
          Voltage_Max: row.Voltage_Max,
          UOM: row.UOM,
          Frequency: row.Frequency,
          Frequency_Min: row.Frequency_MIN,
          Frequency_Max: row.Frequency_MAX,
          PhaseSequence: row.PhaseSequence,
          Unit_Con_Dest: row.Unit_Con_Dest,
          Part_Sr_No: row.Part_Sr_No,
          Caibiration_Status: row.Caibiration_Status,
          Remark: row.Remark,
          CBs_Pressed: row.CBs_Pressed,
          Equipment: row.Equipment,
          Pos: row.Pos,
          Status: row.Status as TaskStatus || 'UNCHECKED',
          Actual_Voltage: row.Actual_Voltage,
          Actual_Frequency: row.Actual_Frequency,
          Input_Value: row.Input_Value,
    
        });
      }
      console.log('Tasks loaded with Remarks:', items.map(item => ({
        TRANS_ID: item.TRANS_ID,
        Input_Type: item.Input_Type,
        Remark: item.Remark
      })));
      return items;
    } catch (error) {
      console.error('Error loading tasks:', error);
      throw error;
    }
  },

  // Update other methods to use the new executeTransaction signature
  async getTaskStatus(transId: number, taskId: number): Promise<{ status: TaskStatus; inputValue: string }> {
    try {
      const result = await this.executeTransaction(
        'SELECT Status FROM aerocheckstrans WHERE TRANS_ID = ? AND TASK_ID = ?',
        [transId, taskId],
        'Failed to get task status'
      );

      if (result.rows.length === 0) {
        return { status: 'UNCHECKED', inputValue: '' };
      }

      const item = result.rows.item(0);
      return {
        status: item.Status || 'UNCHECKED',
        inputValue: '' // Since the column doesn't exist, return empty string
      };
    } catch (error) {
      console.error('Error getting task status:', error);
      throw error;
    }
  },

// Add proper return type and error handling
// In DatabaseManager
async updateTaskStatus(transId: number, status: TaskStatus, taskId: number): Promise<void> {
  try {
    await this.executeTransaction(
      'UPDATE aerocheckstrans SET Status = ? WHERE TRANS_ID = ? AND TASK_ID = ?',
      [status, transId, taskId],
      'Failed to update task status'
    );
  } catch (error) {
    throw new DatabaseError('Failed to update task status', error);
  }
},

// In DatabaseManager
async updateInputValue(transId: number, value: string, taskId: number): Promise<void> {
  try {
    await this.executeTransaction(
      'UPDATE aerocheckstrans SET Remark = ? WHERE TRANS_ID = ? AND TASK_ID = ?', 
      [value, transId, taskId], 
      'Failed to update Remark value'
    );
  } catch (error) {
    console.error('Error updating Remark:', error);
    throw new DatabaseError('Failed to update Remark value', error);
  }
},
  async completeTopicTasks(topicId: string, taskId: number): Promise<void> {
    try {
      await this.executeTransaction(
        'UPDATE aerocheckstrans SET Status = ? WHERE Topic_ID = ? AND TASK_ID = ?',
        ['CHECKED', topicId, taskId],
        'Failed to complete topic tasks'
      );
    } catch (error) {
      console.error('Error completing topic tasks:', error);
      throw error;
    }
  },

  async updateActualValues(
    transId: number,
    actualVoltage: number | null,
    actualFrequency: number | null,
    taskId: number
  ): Promise<void> {
    try {
      await this.executeTransaction(
        'UPDATE aerocheckstrans SET Actual_Voltage = ?, Actual_Frequency = ? WHERE TRANS_ID = ? AND TASK_ID = ?',
        [actualVoltage, actualFrequency, transId, taskId],
        'Failed to update actual values'
      );
    } catch (error) {
      console.error('Error updating actual values:', error);
      throw error;
    }
  },

  async updatePartSerialValues(
    transId: number,
    partSrNo: string,
    calibrationStatus: string,
    taskId: number
  ): Promise<void> {
    try {
      await this.executeTransaction(
        'UPDATE aerocheckstrans SET Part_Sr_No = ?, Caibiration_Status = ? WHERE TRANS_ID = ? AND TASK_ID = ?',
        [partSrNo, calibrationStatus, transId, taskId],
        'Failed to update part serial values'
      );
    } catch (error) {
      throw new DatabaseError('Failed to update part serial values', error);
    }
  },
};

// Update the SubHead component
const SubHead: React.FC<{ 
  title: string;
  currentTasks: TaskItem[];
  taskIndex: number;
  setTaskStates: React.Dispatch<React.SetStateAction<TaskStates>>;
  TASK_ID: number;
}> = ({ title, currentTasks, taskIndex, setTaskStates, TASK_ID }) => {
  useEffect(() => {
    const currentTask = currentTasks[taskIndex];
    const nextTask = currentTasks.slice(taskIndex + 1).find(t => t.Input_Type !== 'SubHead');
    
    if (currentTask && nextTask) {
      try {
        setTaskStates(prev => ({
          ...prev,
          [nextTask.TRANS_ID]: {
            ...prev[nextTask.TRANS_ID],
            isEnabled: true
          }
        }));
      } catch (error) {
        console.error('Error enabling next task:', error);
      }
    }
  }, [currentTasks, taskIndex, TASK_ID]);

  return (
    <View style={styles.subHeadContainer}>
      <View style={styles.subHeadLine} />
      <Text style={styles.subHeadText}>{title}</Text>
      <View style={styles.subHeadLine} />
    </View>
  );
};

// Updated validation function
const validateInput = (task: TaskItem, value: string, type?: 'voltage' | 'frequency'): boolean => {
  // Return false if value is empty or just whitespace
  if (!value?.trim()) return false;

  // Handle voltage validation
  if (task.Input_Type === 'Volt' || type === 'voltage') {
    const numValue = parseFloat(value);
    
    // First check if the value is a valid number
    if (isNaN(numValue)) return false;
    
    // Special case: if both min and max are 0, only check if it's a valid number
    if (task.Voltage_Min === 0 && task.Voltage_Max === 0) {
      return true;
    }
    
    // Handle null/undefined cases for min/max
    const minValue = task.Voltage_Min ?? -Infinity;
    const maxValue = task.Voltage_Max ?? Infinity;
    
    // Check if value is within range
    return numValue >= minValue && numValue <= maxValue;
  }

  // Handle frequency validation (unchanged)
  if (task.Input_Type === 'Freq' || type === 'frequency') {
    const numValue = parseFloat(value);
    if (task.Frequency_Min === 0 && task.Frequency_Max === 0) {
      return !isNaN(numValue);
    }
    return !isNaN(numValue) &&
           (task.Frequency_Min === null || numValue >= task.Frequency_Min) &&
           (task.Frequency_Max === null || numValue <= task.Frequency_Max);
  }

  // For other input types, just check if value exists
  return value.trim().length > 0;
};

//sidebar item which will display the selected items display the header 

interface SidebarProps {
  headings: TaskItem[];
  selectedHeading: TaskItem | null;
  onSelectHeading: (heading: TaskItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  taskStates: TaskStates;
  calculateHeadingProgress: (headingId: number) => { completed: number; total: number };
}

const Sidebar: React.FC<SidebarProps> = ({
  headings,
  selectedHeading,
  onSelectHeading,
  isCollapsed,
  onToggleCollapse,
  taskStates,
  calculateHeadingProgress,
}) => {
  const sidebarWidth = isCollapsed ? 60 : SIDEBAR_WIDTH; // Adjust width based on collapse state

  return (
    <View style={[styles.sidebar, { width: sidebarWidth }]}>
      <View style={[styles.sidebarHeader, isCollapsed && styles.collapsedHeader]}>
        {!isCollapsed ? (
          <>
            <Text style={styles.sidebarTitle}>Task Headings</Text>
            <TouchableOpacity
              onPress={onToggleCollapse}
              style={styles.collapseButton}
            >
              <Text style={styles.collapseButtonText}>≡</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onToggleCollapse}
            style={[styles.collapseButton, styles.collapsedButton]}
          >
            <Text style={styles.collapseButtonText}>≡</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Only show the list when not collapsed */}
      {!isCollapsed && (
        <ScrollView style={styles.navList}>
          {headings.map((heading) => {
            const { completed, total } = calculateHeadingProgress(heading.TRANS_ID);
            const progress = total > 0 ? (completed / total) * 100 : 0;
            
            return (
              <TouchableOpacity
                key={heading.TRANS_ID}
                onPress={() => onSelectHeading(heading)}
                style={[styles.navItem, selectedHeading?.TRANS_ID === heading.TRANS_ID && styles.navItemSelected]}
              >
                <View style={styles.expandedNavContent}>
                  <View style={styles.headingTitleContainer}>
                    <Text style={styles.headingNumber}>{headings.indexOf(heading) + 1}.</Text>
                    <Text
                      style={[styles.headingTitle, selectedHeading?.TRANS_ID === heading.TRANS_ID && styles.headingTitleSelected]}
                      numberOfLines={2}
                    >
                      {heading.Check_Name}
                    </Text>
                  </View>

                  <View style={styles.headingProgressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${progress}%` }, progress === 100 && styles.progressFillComplete]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {completed}/{total} tasks
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, progress === 100 ? styles.statusComplete : progress > 0 ? styles.statusInProgress : styles.statusPending]}>
                    <Text style={styles.statusText}>
                      {progress === 100 ? 'Complete' : progress > 0 ? 'In Progress' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

// Components
const Checkbox: React.FC<{
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}> = React.memo(({ checked, onToggle, disabled }) => {
  return (
    <View style={styles.inputWrapper}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          disabled && (checked ? styles.checkboxDisabledChecked : styles.checkboxDisabledUnchecked),
        ]}
        onPress={onToggle}
        disabled={disabled}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      {disabled && <View style={styles.disabledOverlay} />}
    </View>
  );
});


interface VoltFreqInputProps {
  task: TaskItem;  // Make sure TaskItem interface is imported or defined
  onValidChange: (isValid: boolean) => void;
  
}

interface VoltFreqComponentProps {
  task: TaskItem;
  state: TaskState;
  onStateChange: (transId: number, isValid: boolean) => void;
  setTaskStates: React.Dispatch<React.SetStateAction<TaskStates>>;
  TASK_ID: number;
}





const VoltageInput: React.FC<VoltageInputProps & { TASK_ID: number }> = ({ task, onStateChange, setTaskStates, state, TASK_ID }) => { 
  const [value, setValue] = useState(task.Actual_Voltage?.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  // Use the common camera functionality
  const { CameraButton, ImagePreviewModal } = useCameraFunctionality(task, 'Volt', state, TASK_ID);

  const validateAndStoreVoltage = async (inputValue: string) => {
    setValue(inputValue);
    
    // Clear previous timeout if it exists
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set a new timeout for 1 second
    const newTimeoutId = setTimeout(async () => {
      // Validate the input
      const isValid = validateInput(task, inputValue, 'voltage');
      
      // Set appropriate error message
      if (!inputValue.trim()) {
        setError('Value is required');
      } else if (isNaN(parseFloat(inputValue))) {
        setError('Please enter a valid number');
      } else {
        const voltage = parseFloat(inputValue);
        const minValue = task.Voltage_Min ?? -Infinity;
        const maxValue = task.Voltage_Max ?? Infinity;

        // Check if the value is within the specified range
        if (voltage < minValue || voltage > maxValue) {
          setError(`Value should be in between ${minValue} and ${maxValue} ${task.UOM || 'V'}`);
          // Removed setValue('') to keep the input value
        } else {
          setError(null);
        }
      }

      // Update state and database if valid
      if (true) {
        try {
          await DatabaseManager.updateActualValues(task.TRANS_ID, parseFloat(inputValue), null,TASK_ID);
          await DatabaseManager.updateTaskStatus(task.TRANS_ID, 'CHECKED',TASK_ID);
          
          // Update current task state and enable next task
          setTaskStates(prev => {
            // Find the next task by getting all task IDs and finding the next one
            const taskIds = Object.keys(prev).map(Number).sort((a, b) => a - b);
            const currentIndex = taskIds.indexOf(task.TRANS_ID);
            const nextTaskId = taskIds[currentIndex + 1];

            return {
              ...prev,
              [task.TRANS_ID]: {
                ...prev[task.TRANS_ID],
                checked: true,
                isValid: true,
                voltageValue: inputValue,
                status: 'CHECKED'
              },
              ...(nextTaskId ? {
                [nextTaskId]: {
                  ...prev[nextTaskId],
                  isEnabled: true
                }
              } : {})
            };
          });
          
          if (onStateChange) {
            onStateChange(task.TRANS_ID, true);
          }
        } catch (error) {
          console.error('Failed to update voltage:', error);
          setError('Failed to save value. Please try again.');
        }
      }
    }, 1000);

    setTimeoutId(newTimeoutId);
  };

  // Check if input is valid
  const isInRange = value && !error && validateInput(task, value, 'voltage');

  return (
    <View style={styles.inputContainer}>
      {/* Display Check_Name */}
      <Text style={styles.checkName}>{task.Check_Name}</Text>

      {/* Display Pins and Connectors if they are not null */}
      {(task.Pins || task.Connectors) && (
        <View style={styles.pinsConnectorsContainer}>
          {task.Pins && <Text style={styles.pinsText}>Pins: {task.Pins}</Text>}
          {task.Connectors && <Text style={styles.connectorsText}>Connectors: {task.Connectors}</Text>}
        </View>
      )}
      
      <Text style={styles.label}>
        Voltage {task.Voltage_Min === task.Voltage_Max 
          ? `(Exactly {task.Voltage_Min ${task.UOM || 'V'})` 
          : `(${task.Voltage_Min ?? 'any'} - ${task.Voltage_Max ?? 'any'} ${task.UOM || 'V'})`}
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={validateAndStoreVoltage}
          keyboardType="numeric"
          style={[
            styles.input,
            error ? styles.inputError : null,
            !state?.isEnabled && styles.inputDisabled,
            isInRange && styles.inputValidRange,
          ]}
          placeholder="Enter voltage"
          editable={state?.isEnabled}
          onBlur={() => {
            validateAndStoreVoltage(value);
          }}
        />
        <Text style={styles.unit}>{task.UOM || 'V'}</Text>
        
        {/* Add Camera Button */}
        <CameraButton disabled={!state?.isEnabled} />
        
        {!state?.isEnabled && <View style={styles.disabledOverlay} />}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Image Preview Modal */}
      <ImagePreviewModal />
    </View>
  );
};
        




// Updated VoltFreqComponent to always save values and enable next task
const VoltFreqComponent: React.FC<VoltFreqComponentProps & { TASK_ID: number }> = ({ 
  task, 
  state, 
  onStateChange, 
  setTaskStates, 
  TASK_ID 
}) => {
  const [voltageValue, setVoltageValue] = useState(task.Actual_Voltage?.toString() || '');
  const [frequencyValue, setFrequencyValue] = useState(task.Actual_Frequency?.toString() || '');
  const [voltageError, setVoltageError] = useState(false);
  const [frequencyError, setFrequencyError] = useState(false);

  // Use the common camera functionality
  const { CameraButton, ImagePreviewModal } = useCameraFunctionality(task, 'VoltFreq', state, TASK_ID);

  // Check if voltage and frequency are valid
  const isVoltageInRange = voltageValue && validateInput(task, voltageValue, 'voltage') && !voltageError;
  const isFrequencyInRange = frequencyValue && validateInput(task, frequencyValue, 'frequency') && !frequencyError;

  const validateAndStoreValues = async (vValue: string, fValue: string, type: 'voltage' | 'frequency') => {
    // Validate but don't prevent saving
    const isValidVoltage = type === 'voltage' ? validateInput(task, vValue, 'voltage') : validateInput(task, voltageValue, 'voltage');
    const isValidFrequency = type === 'frequency' ? validateInput(task, fValue, 'frequency') : validateInput(task, frequencyValue, 'frequency');
    
    // Set persistent error states based on validation
    if (vValue) {
      setVoltageError(!isValidVoltage);
    }
    
    if (fValue) {
      setFrequencyError(!isValidFrequency);
    }
    
    // Update database and enable next task if both values are provided,
    // regardless of whether they're in range
    if (vValue && fValue) {
      try {
        // Always save values to database
        await Promise.all([
          DatabaseManager.updateVoltFreqValues(task.TRANS_ID, vValue, fValue, TASK_ID),
          DatabaseManager.updateTaskStatus(task.TRANS_ID, 'CHECKED', TASK_ID)
        ]);

        setTaskStates(prev => {
          // Find the next task by getting all task IDs and finding the next one
          const taskIds = Object.keys(prev).map(Number).sort((a, b) => a - b);
          const currentIndex = taskIds.indexOf(task.TRANS_ID);
          const nextTaskId = taskIds[currentIndex + 1];

          return {
            ...prev,
            [task.TRANS_ID]: {
              ...prev[task.TRANS_ID],
              checked: true,
              // Mark as valid for workflow progression even if values are out of range
              isValid: true,
              voltageValue: vValue,
              frequencyValue: fValue,
              status: 'CHECKED'
            },
            ...(nextTaskId ? {
              [nextTaskId]: {
                ...prev[nextTaskId],
                isEnabled: true
              }
            } : {})
          };
        });
        
        if (onStateChange) {
          onStateChange(task.TRANS_ID, true);
        }
      } catch (error) {
        console.error('Failed to update values:', error);
        Alert.alert('Error', 'Failed to save values. Please try again.');
      }
    }
  };

  return (
    <View style={styles.voltFreqContainer}>
      {/* Task Name */}
      <Text style={styles.voltFreqTaskName}>{task.Check_Name}</Text>

      {/* Pins and Connectors if they exist */}
      {(task.Pins || task.Connectors) && (
        <View style={styles.pinsConnectorsContainer}>
          {task.Pins && <Text style={styles.pinsText}>Pins: {task.Pins}</Text>}
          {task.Connectors && <Text style={styles.connectorsText}>Connectors: {task.Connectors}</Text>}
        </View>
      )}

      {/* Inputs Container */}
      <View style={styles.voltFreqInputsRow}>
        {/* Voltage Input */}
        <View style={styles.voltFreqInputGroup}>
          <Text style={styles.voltFreqLabel}>
            Voltage {task.Voltage_Min === task.Voltage_Max 
              ? `(Exactly ${task.Voltage_Min} ${task.UOM || 'V'})` 
              : `(${task.Voltage_Min || 0} - ${task.Voltage_Max || 0} ${task.UOM || 'V'})`}
          </Text>
          <View style={styles.voltFreqInputWrapper}>
            <TextInput
              value={voltageValue}
              onChangeText={(value) => {
                setVoltageValue(value);
                validateAndStoreValues(value, frequencyValue, 'voltage');
              }}
              keyboardType="numeric"
              style={[
                styles.voltFreqInput,
                voltageError && styles.inputError,
                isVoltageInRange && styles.inputValidRange,
                !state?.isEnabled && styles.inputDisabled
              ]}
              placeholder="Enter voltage"
              editable={state?.isEnabled}
            />
            <Text style={styles.voltFreqUnit}>{task.UOM || 'V'}</Text>
            
            {/* Camera Button for Voltage */}
            <CameraButton disabled={!state?.isEnabled} />
          </View>
        </View>

        {/* Frequency Input */}
        <View style={styles.voltFreqInputGroup}>
          <Text style={styles.voltFreqLabel}>
            Frequency {task.Frequency_Min === task.Frequency_Max 
              ? `(Exactly ${task.Frequency_Min} Hz)` 
              : `(${task.Frequency_Min || 0} - ${task.Frequency_Max || 0} Hz)`}
          </Text>
          <View style={styles.voltFreqInputWrapper}>
            <TextInput
              value={frequencyValue}
              onChangeText={(value) => {
                setFrequencyValue(value);
                validateAndStoreValues(voltageValue, value, 'frequency');
              }}
              keyboardType="numeric"
              style={[
                styles.voltFreqInput,
                frequencyError && styles.inputError,
                isFrequencyInRange && styles.inputValidRange,
                !state?.isEnabled && styles.inputDisabled
              ]}
              placeholder="Enter frequency"
              editable={state?.isEnabled}
            />
            <Text style={styles.voltFreqUnit}>Hz</Text>
            
            {/* Camera Button for Frequency */}
            <CameraButton disabled={!state?.isEnabled} />
          </View>
        </View>
      </View>

      {/* Image Preview Modal */}
      <ImagePreviewModal />
    </View>
  );
};




const TaskInput: React.FC<{
  task: TaskItem;
  value: string;
  onChangeText: (value: string) => void;
  isValid: boolean;
  disabled?: boolean;
  type?: 'voltage' | 'frequency';
  TASK_ID: number;  // Add TASK_ID to props
}> = React.memo(({
  task,
  value,
  onChangeText,
  isValid,
  disabled = false,
  type,
  TASK_ID  // Destructure TASK_ID
}) => {
  // Use the common camera functionality
  const { CameraButton, ImagePreviewModal } = useCameraFunctionality(
    task, 
    type === 'frequency' ? 'Freq' : (type === 'voltage' ? 'Volt' : task.Input_Type),
    {
      isEnabled: !disabled,
      checked: false,
      isValid: false,
      inputValue: '',
      status: 'UNCHECKED'
    },
    TASK_ID
  );

  const getPlaceholder = () => {
    switch (type || task.Input_Type) {
      case 'voltage':
      case 'Volt':
        return `${task.Voltage_Min || 0} - ${task.Voltage_Max || 0} ${task.UOM || 'V'}`;
      case 'frequency':
      case 'Freq':
        return `${task.Frequency_Min || 0} - ${task.Frequency_Max || 0} Hz`;
      case 'Input':
        return 'Enter value here';
      default:
        return 'Enter value';
    }
  };

  const keyboardType = (type || task.Input_Type) === 'Volt' || 
                      (type || task.Input_Type) === 'Freq' || 
                      type === 'voltage' || 
                      type === 'frequency' ? 'numeric' : 'default';

  return (
    <View>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            !isValid && value !== '' && styles.inputError,
            disabled && styles.inputDisabled,
            isValid && value !== '' && styles.validInput
          ]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={!disabled}
          placeholder={getPlaceholder()}
        />
        
        {/* Add camera button for Volt and Freq types */}
        {(type === 'voltage' || type === 'frequency' || 
          task.Input_Type === 'Volt' || task.Input_Type === 'Freq') && (
          <CameraButton disabled={disabled} />
        )}
        
        {disabled && <View style={styles.disabledOverlay} />}
      </View>
      
      {/* Image Preview Modal */}
      <ImagePreviewModal />
    </View>
  );
});




const TaskItem: React.FC<{
  task: TaskItem;
  state: TaskState;
  onToggle: (transId: number) => void;
  onInputChange: (transId: number, value: string) => void;
  setTaskStates: React.Dispatch<React.SetStateAction<TaskStates>>;
  currentTasks: TaskItem[];
  TASK_ID: number;
  onStateChange: (transId: number, isValid: boolean) => void;
  taskStates: TaskStates;
}> = React.memo(({
  task,
  state,
  onToggle,
  onInputChange,
  setTaskStates,
  currentTasks,
  TASK_ID,
  onStateChange,
  taskStates
}) => {
  const handleInputChange = useCallback(
    (transId: number, value1: string, value2?: string) => {
      if (value2 !== undefined) {
        // Handle phase sequence inputs
        setTaskStates(prev => ({
          ...prev,
          [transId]: {
            ...prev[transId],
            voltageValue: value1,
            frequencyValue: value2
          }
        }));
      } else {
        // Handle single input value
        setTaskStates(prev => ({
          ...prev,
          [transId]: {
            ...prev[transId],
            inputValue: value1
          }
        }));
      }
    },
    [setTaskStates]
  );

  const handleInputtChange = async (transId: number, value: string) => {
    try {
      // Update local state immediately for responsive UI
      setTaskStates(prev => ({
        ...prev,
        [transId]: {
          ...prev[transId],
          inputValue: value,
          isEnabled: true, // Ensure the input remains enabled
        }
      }));

      // Debounce the database update
      const debouncedUpdate = debounce(async () => {
        await DatabaseManager.updateInputValue(transId, value,TASK_ID);
        
        const shouldMarkChecked = value.trim().length > 0;
        if (shouldMarkChecked) {
          await DatabaseManager.updateTaskStatus(transId, 'CHECKED',TASK_ID);
        }

        const currentIndex = currentTasks.findIndex(t => t.TRANS_ID === transId);
        const nextTask = currentTasks[currentIndex + 1];

        setTaskStates(prev => ({
          ...prev,
          [transId]: {
            ...prev[transId],
            inputValue: value,
            isValid: true,
            checked: shouldMarkChecked,
            status: shouldMarkChecked ? 'CHECKED' : 'UNCHECKED',
            isEnabled: true, // Keep the current input enabled
          },
          ...(shouldMarkChecked && nextTask ? {
            [nextTask.TRANS_ID]: {
              ...prev[nextTask.TRANS_ID],
              isEnabled: true
            }
          } : {})
        }));

        console.log(`Task ${transId} updated with value: ${value}`);
        if (nextTask) {
          console.log(`Next task ${nextTask.TRANS_ID} enabled`);
        }
      }, 2000);

      debouncedUpdate();
    } catch (error) {
      console.error('Failed to update input value:', error);
      Alert.alert('Error', 'Failed to update input value');
    }
  };

  const handlePartSerialUpdate = (value: string, field: 'partSrNo' | 'calibrationStatus') => {
    if (!state.isEnabled) return;
    
    setTaskStates((prev) => {
      const currentState = prev[task.TRANS_ID];
      const updatedState = {
        ...currentState,
        [field]: value,
      };
      
      // Check if both fields are filled
      const isValid = !!(
        (field === 'partSrNo' ? value : currentState.partSrNo) && 
        (field === 'calibrationStatus' ? value : currentState.calibrationStatus)
      );
      
      // Find the next task to enable
      const nextTask = currentTasks.find(t => t.TRANS_ID > task.TRANS_ID);
      
      return {
        ...prev,
        [task.TRANS_ID]: {
          ...updatedState,
          isValid,
          checked: isValid
        },
        ...(isValid && nextTask ? {
          [nextTask.TRANS_ID]: {
            ...prev[nextTask.TRANS_ID],
            isEnabled: true
          }
        } : {})
      };
    });

    if (value) {
      // Update both part serial values and status in the database
      Promise.all([
        DatabaseManager.updatePartSerialValues(
          task.TRANS_ID,
          field === 'partSrNo' ? value : (state.partSrNo || ''),
          field === 'calibrationStatus' ? value : (state.calibrationStatus || ''),
          TASK_ID
        ),
        // Check if both fields are filled to update status
        DatabaseManager.updateTaskStatus(
          task.TRANS_ID,
          !!(
            (field === 'partSrNo' ? value : state.partSrNo) && 
            (field === 'calibrationStatus' ? value : state.calibrationStatus)
          ) ? 'CHECKED' : 'UNCHECKED',
          TASK_ID
        )
      ]).catch(error => {
        console.error('Failed to update values:', error);
      });
    }
  };

  const renderInputField = () => {
    switch (task.Input_Type) {
      case 'Heading':
        return null;
  
      case 'SubHead':
        return (
          <SubHead 
            title={task.Check_Name}
            currentTasks={currentTasks}
            taskIndex={currentTasks.findIndex(t => t.TRANS_ID === task.TRANS_ID)}
            setTaskStates={setTaskStates}
            TASK_ID={TASK_ID}
          />
        );
  
      case 'Check':
        return (
          <View style={styles.checkContainer}>
            <Text style={styles.checkLabel}>{task.Check_Name}</Text>
            <Checkbox
              checked={state.checked}
              onToggle={() => onToggle(task.TRANS_ID)}
              disabled={!state.isEnabled}
            />
          </View>
        );
  
      case 'Input':
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{task.Check_Name}</Text>
            <TextInput
              style={[
                styles.input,
                !state.isEnabled && styles.inputDisabled,
                state.checked && styles.validInput
              ]}
              value={state.inputValue}
              onChangeText={(value) => handleInputtChange(task.TRANS_ID, value)}
              editable={true} // Always allow editing for Input type
              placeholder="Enter value"
              returnKeyType="default"
              blurOnSubmit={false}
              multiline={true}
              onSubmitEditing={() => {}}
            />
            {state.checked && (
              <View style={styles.statusIndicatorContainer}>
                <Text style={styles.statusText}>✓ Task Completed</Text>
              </View>
            )}
          </View>
        );
  
      case 'Note':
        return (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{task.Check_Name}</Text>
            {task.Remark && (
              <Text style={styles.remarkText}>{task.Remark}</Text>
            )}
          </View>
        );
  
      case 'Volt':
        return (
          <VoltageInput
            task={task}
            onStateChange={(transId, isValid) => {
              setTaskStates((prev: TaskStates) => ({
                ...prev,
                [transId]: {
                  ...prev[transId],
                  isValid: isValid,
                  checked: isValid
                }
              }));
            }}
            setTaskStates={setTaskStates}
            state={state}
            TASK_ID={TASK_ID}
          />
        );
  
        case 'VoltFreq':
          return (
            <VoltFreqComponent
              task={task}
              state={state} // Use the state as is, don't override isEnabled
              onStateChange={(transId, isValid) => {
                setTaskStates((prev: TaskStates) => ({
                  ...prev,
                  [transId]: {
                    ...prev[transId],
                    isValid: isValid,
                    checked: isValid
                  }
                }));
              }}
              setTaskStates={setTaskStates}
              TASK_ID={TASK_ID}
            />
          );
        
      case 'Freq':
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {task.Check_Name} ({task.Frequency_Min || 0} - {task.Frequency_Max || 0} Hz)
            </Text>
            <View style={styles.frequencyInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  !state.isValid && styles.inputError,
                  !state.isEnabled && styles.inputDisabled
                ]}
                value={state.frequencyValue || task.Actual_Frequency?.toString() || ''}
                onChangeText={(value) => onInputChange(task.TRANS_ID,value)}
                keyboardType="numeric"
                placeholder={`Enter frequency`}
                editable={!state.isEnabled}
              />
              <Text style={styles.unitText}>Hz</Text>
            </View>
          </View>
        );
  
      case 'PartSerail':
        return (
          <Animatable.View 
            animation="fadeIn" 
            duration={500} 
            style={styles.partSerialWrapper}
          >
            <View style={styles.partSerialCard}>
              <Text style={styles.partSerialTitle}>{task.Check_Name}</Text>
              
              <View style={styles.partSerialGrid}>
                {/* Part Serial Number Input */}
                <View style={styles.partSerialField}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.fieldLabel}>Part Serial Number</Text>
                    {state.partSrNo && !state.isValid && (
                      <Text style={styles.requiredText}>*Required</Text>
                    )}
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.modernInput,
                        !state.isEnabled && styles.inputDisabled,
                        state.partSrNo && !state.isValid && styles.inputError
                      ]}
                      value={state.partSrNo || ''}
                      onChangeText={(value) => handlePartSerialUpdate(value, 'partSrNo')}
                      placeholder="Enter Part Serial Number"
                      editable={state.isEnabled}
                      placeholderTextColor="#A0AEC0"
                    />
                    {state.isEnabled && (
                      <Animatable.View 
                        animation="fadeIn" 
                        style={[
                          styles.inputStatusIndicator,
                          {
                            backgroundColor: state.partSrNo && state.isValid ? '#48BB78' : '#E2E8F0'
                          }
                        ]}
                      />
                    )}
                  </View>
                </View>

                {/* Calibration Status Input */}
                <View style={styles.partSerialField}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.fieldLabel}>Calibration Status</Text>
                    {state.calibrationStatus && !state.isValid && (
                      <Text style={styles.requiredText}>*Required</Text>
                    )}
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.modernInput,
                        !state.isEnabled && styles.inputDisabled,
                        state.calibrationStatus && !state.isValid && styles.inputError
                      ]}
                      value={state.calibrationStatus || ''}
                      onChangeText={(value) => handlePartSerialUpdate(value, 'calibrationStatus')}
                      placeholder="Enter Calibration Status"
                      editable={state.isEnabled}
                      placeholderTextColor="#A0AEC0"
                    />
                    {state.isEnabled && (
                      <Animatable.View 
                        animation="fadeIn" 
                        style={[
                          styles.inputStatusIndicator,
                          {
                            backgroundColor: state.calibrationStatus && state.isValid ? '#48BB78' : '#E2E8F0'
                          }
                        ]}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Status Message */}
              {state.isEnabled && (state.partSrNo || state.calibrationStatus) && (
                <Animatable.Text 
                  animation="fadeIn" 
                  style={[
                    styles.statusMessage,
                    state.isValid ? styles.validMessage : styles.invalidMessage
                  ]}
                >
                    {state.isValid 
                    ? <Text style={styles.validStatusMessage}>✓ All information is valid</Text>
                    : <Text style={styles.invalidStatusMessage}>⚠ Please fill in all required fields</Text>
                  }
                </Animatable.Text>
              )}
            </View>
          </Animatable.View>
        );
  

        
      case 'PhaseSeq':
        return (
          <PhaseSeqComponent
            task={task}
            state={state}
            onStateChange={onStateChange}
            setTaskStates={setTaskStates}
            TASK_ID={TASK_ID}
            currentTasks={currentTasks}
            taskStates={taskStates}
          />
        );
  
      default:
        return null;
    }
  };

  // Don't render anything for Heading type
  if (task.Input_Type === 'Heading') return null;

  return (
    <View style={styles.taskItem}>
      {renderInputField()}
    </View>
  );
});

// Add this utility function if not already present
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add the PhaseSeqComponent
const PhaseSeqComponent: React.FC<{
  task: TaskItem;
  state: TaskState;
  onStateChange: (transId: number, isValid: boolean) => void;
  setTaskStates: React.Dispatch<React.SetStateAction<TaskStates>>;
  TASK_ID: number;
  currentTasks: TaskItem[];
  taskStates: TaskStates;
}> = ({ 
  task, 
  state, 
  onStateChange, 
  setTaskStates, 
  TASK_ID, 
  currentTasks,
  taskStates
}) => {
  const [phaseSeq1, setPhaseSeq1] = useState(task.Actual_Voltage?.toString() || '');
  const [phaseSeq2, setPhaseSeq2] = useState(task.Actual_Frequency?.toString() || '');
  const [isMatched, setIsMatched] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Use the common camera functionality
  const { CameraButton, ImagePreviewModal } = useCameraFunctionality(task, 'PhaseSeq', state, TASK_ID);

  // Check if both inputs are valid numbers
  const isValidInput1 = phaseSeq1 && !isNaN(parseFloat(phaseSeq1));
  const isValidInput2 = phaseSeq2 && !isNaN(parseFloat(phaseSeq2));

  const checkPhaseSequence = useCallback(async (value1: string, value2: string) => {
    if (!value1 || !value2) return;
    
    setIsChecking(true);
    try {
      const firstValue = parseFloat(value1);
      const secondValue = parseFloat(value2);

      // Check if both inputs are valid numbers
      if (isNaN(firstValue) || isNaN(secondValue)) {
        setIsMatched(false);
        ToastAndroid.show('Please enter valid numbers', ToastAndroid.SHORT);
        return;
      }

      // Compare numbers directly
      const matched = Math.abs(firstValue - secondValue) < 0.0001; // Using small epsilon for float comparison
      setIsMatched(matched);

      if (matched) {
        try {
          await Promise.all([
            DatabaseManager.updateActualValues(task.TRANS_ID, firstValue, secondValue, TASK_ID),
            DatabaseManager.updateTaskStatus(task.TRANS_ID, 'CHECKED', TASK_ID)
          ]);

          // Find the next task in the current tasks array
          const currentTasks = Object.keys(taskStates).map(Number).sort((a, b) => a - b);
          const currentIndex = currentTasks.indexOf(task.TRANS_ID);
          const nextTaskId = currentTasks[currentIndex + 1];

          setTaskStates(prev => ({
            ...prev,
            [task.TRANS_ID]: {
              ...prev[task.TRANS_ID],
              checked: true,
              isValid: true,
              status: 'CHECKED',
              voltageValue: value1,
              frequencyValue: value2
            },
            // Enable the next task if it exists
            ...(nextTaskId && {
              [nextTaskId]: {
                ...prev[nextTaskId],
                isEnabled: true
              }
            })
          }));

          onStateChange(task.TRANS_ID, true);
       
        } catch (error) {
          console.error('Failed to update phase sequence:', error);
          Alert.alert('Error', 'Failed to save phase sequence values');
        }
      } else {
        ToastAndroid.show('Phase sequence readings do not match', ToastAndroid.SHORT);
      }
    } finally {
      setIsChecking(false);
    }
  }, [task.TRANS_ID, TASK_ID, onStateChange, setTaskStates, taskStates, currentTasks]);

  return (
    <View style={styles.phaseSeqContainer}>
      <Text style={styles.phaseSeqLabel}>{task.Check_Name}</Text>
      
      <View style={styles.phaseSeqInputContainer}>
        <View style={styles.phaseSeqInputWrapper}>
          <Text style={styles.inputLabel}>First Reading</Text>
          <View style={styles.inputWithCamera}>
            <TextInput
              value={phaseSeq1}
              onChangeText={value => {
                setPhaseSeq1(value);
                if (phaseSeq2) checkPhaseSequence(value, phaseSeq2);
              }}
              style={[
                styles.phaseSeqInput,
                isMatched && styles.phaseSeqInputMatched,
                isValidInput1 && !isMatched && styles.inputValidRange,
                isChecking && styles.phaseSeqInputChecking,
                !state.isEnabled && styles.inputDisabled
              ]}
              keyboardType="numeric"
              placeholder="Enter first reading"
              editable={state.isEnabled && !isChecking}
            />
            <CameraButton disabled={!state.isEnabled || isChecking} />
          </View>
          {!state.isEnabled && <View style={styles.disabledOverlay} />}
        </View>

        <View style={styles.phaseSeqInputWrapper}>
          <Text style={styles.inputLabel}>Second Reading</Text>
          <View style={styles.inputWithCamera}>
            <TextInput
              value={phaseSeq2}
              onChangeText={value => {
                setPhaseSeq2(value);
                if (phaseSeq1) checkPhaseSequence(phaseSeq1, value);
              }}
              style={[
                styles.phaseSeqInput,
                isMatched && styles.phaseSeqInputMatched,
                isValidInput2 && !isMatched && styles.inputValidRange,
                isChecking && styles.phaseSeqInputChecking,
                !state.isEnabled && styles.inputDisabled
              ]}
              keyboardType="numeric"
              placeholder="Enter second reading"
              editable={state.isEnabled && !isChecking}
            />
            <CameraButton disabled={!state.isEnabled || isChecking} />
          </View>
          {!state.isEnabled && <View style={styles.disabledOverlay} />}
        </View>
      </View>

      {isChecking && (
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          style={styles.checkingIndicator}
        >
          <Text style={styles.checkingText}>Checking readings...</Text>
        </Animatable.View>
      )}

      {isMatched && !isChecking && (
        <Animatable.View animation="fadeIn" style={styles.matchedIndicator}>
          <Text style={styles.matchedText}>✓ Readings Match</Text>
        </Animatable.View>
      )}

      {!isMatched && phaseSeq1 && phaseSeq2 && !isChecking && (
        <Animatable.View animation="fadeIn" style={styles.mismatchIndicator}>
          <Text style={styles.mismatchText}>✗ Readings Do Not Match</Text>
        </Animatable.View>
      )}
      
      {!state.isEnabled && (
        <View style={styles.componentDisabledOverlay}>
          <Text style={styles.disabledText}>Complete previous tasks to enable</Text>
        </View>
      )}
      
      {/* Image Preview Modal */}
      <ImagePreviewModal />
    </View>
  );
};

const TaskListScreen: React.FC = () => {
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<TaskListScreenNavigationProp>();
  const route = useRoute<TaskListScreenRouteProp>();
  
  const TASK_ID = route.params?.taskId;

  // Add more detailed logging

  
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [headings, setHeadings] = useState<TaskItem[]>([]);
  const [currentTasks, setCurrentTasks] = useState<TaskItem[]>([]);
  const [taskStates, setTaskStates] = useState<TaskStates>({});
  const [selectedHeading, setSelectedHeading] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Start open
  const [lastTaskCompletedInDB, setLastTaskCompletedInDB] = useState<boolean>(false);
  const isKeyboardVisible = useKeyboardHandling();

  // Add a new state to store all tasks for all headings
  const [allTasksByHeading, setAllTasksByHeading] = useState<Record<number, TaskItem[]>>({});

  const isMobile = width < MOBILE_BREAKPOINT;

  // Memoize callbacks
  const onStateChange = useCallback((transId: number, isValid: boolean) => {
    // Handle state change logic here
    console.log(`Task ${transId} validity changed to ${isValid}`);
    
    setTaskStates(prev => ({
      ...prev,
      [transId]: {
        ...prev[transId],
        isValid
      }
    }));
  }, [setTaskStates]);

  // Add a helper function to check for SubHead and enable next element
  const handleSubHeadEnabling = useCallback((updates: TaskStates, tasks: TaskItem[]): TaskStates => {
    const modifiedUpdates = { ...updates };
    
    // Check each update to see if it's enabling a SubHead
    Object.entries(updates).forEach(([transIdStr, state]) => {
      const transId = parseInt(transIdStr);
      const task = tasks.find(t => t.TRANS_ID === transId);
      
      // If this is a SubHead that something is trying to enable
      if (task && task.Input_Type === 'SubHead' && state.isEnabled) {
        console.log(`Preventing SubHead ${transId} from being enabled. Finding next element instead.`);
        
        // Don't enable the SubHead
        modifiedUpdates[transId] = {
          ...state,
          isEnabled: false
        };
        
        // Find and enable the next non-SubHead task instead
        const currentIndex = tasks.findIndex(t => t.TRANS_ID === transId);
        const nextNonSubHeadTask = tasks.slice(currentIndex + 1)
          .find(t => t.Input_Type !== 'SubHead');
        
        if (nextNonSubHeadTask) {
          console.log(`Enabling next task ${nextNonSubHeadTask.TRANS_ID} instead of SubHead`);
          modifiedUpdates[nextNonSubHeadTask.TRANS_ID] = {
            ...(modifiedUpdates[nextNonSubHeadTask.TRANS_ID] || {}),
            isEnabled: true
          };
        }
      }
    });
    
    return modifiedUpdates;
  }, []);

  // Initialize task states with special handling for first SubHead
  const initializeTaskStates = useCallback(async (tasksData: TaskItem[]): Promise<TaskStates> => {
    const newStates: TaskStates = {};
    let firstUncheckedFound = false;
    let isFirstElementSubHead = tasksData.length > 0 && tasksData[0].Input_Type === 'SubHead';

    // First pass - initialize all states and find checked status
    for (let i = 0; i < tasksData.length; i++) {
      const task = tasksData[i];
      const nextTask = i < tasksData.length - 1 ? tasksData[i + 1] : null;
      
      try {
        const { status } = await DatabaseManager.getTaskStatus(task.TRANS_ID, TASK_ID);
        const isChecked = status === 'CHECKED';

        // Special case: This is a SubHead (will never be enabled)
        if (task.Input_Type === 'SubHead') {
          newStates[task.TRANS_ID] = {
            checked: false,
            isValid: false,
            inputValue: '',
            isEnabled: false,
            voltageValue: '',
            frequencyValue: '',
            partSrNo: '',
            calibrationStatus: '',
            voltageValid: false,
            frequencyValid: false,
            status: 'UNCHECKED'
          };
          
          // If this is the first element and a SubHead, enable the next non-SubHead task
          if (i === 0 && nextTask && nextTask.Input_Type !== 'SubHead') {
            const nextTaskStatus = await DatabaseManager.getTaskStatus(nextTask.TRANS_ID, TASK_ID);
            // Only enable if not already checked
            if (nextTaskStatus.status !== 'CHECKED') {
              firstUncheckedFound = true;
            }
          }
          
          continue;
        }

        // For non-SubHead tasks, determine if they should be enabled
        // Enable the first unchecked task, or the task right after the first SubHead
        const shouldEnable = (!isChecked && !firstUncheckedFound) || 
                            (i === 1 && isFirstElementSubHead && !isChecked);
        
        if (shouldEnable) {
          firstUncheckedFound = true;
        }

        newStates[task.TRANS_ID] = {
          checked: isChecked,
          isValid: isChecked,
          inputValue: task.Input_Type === 'Input' ? task.Remark || '' : '',
          isEnabled: shouldEnable,
          voltageValue: task.Input_Type === 'Volt' ? task.Actual_Voltage?.toString() || '' : '',
          frequencyValue: task.Input_Type === 'Freq' ? task.Actual_Frequency?.toString() || '' : '',
          partSrNo: task.Part_Sr_No || '',
          calibrationStatus: task.Caibiration_Status || '',
          voltageValid: isChecked,
          frequencyValid: isChecked,
          status: status || 'UNCHECKED'
        };
      } catch (error) {
        console.error(`Error initializing task ${task.TRANS_ID}:`, error);
      }
    }

    // Second pass - if no unchecked task was found and enabled, enable the first non-SubHead task
    if (!firstUncheckedFound && tasksData.length > 0) {
      console.log("No unchecked tasks found, enabling first non-SubHead task");
      const firstNonSubHeadTask = tasksData.find(t => t.Input_Type !== 'SubHead');
      if (firstNonSubHeadTask) {
        newStates[firstNonSubHeadTask.TRANS_ID] = {
          ...newStates[firstNonSubHeadTask.TRANS_ID],
          isEnabled: true
        };
        console.log(`Enabled first non-SubHead task: ${firstNonSubHeadTask.TRANS_ID}`);
      }
    }

    // At the end, apply the SubHead handling
    return handleSubHeadEnabling(newStates, tasksData);
  }, [handleSubHeadEnabling]);

  // Load headings and tasks
  const loadHeadingsAndTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading all headings and tasks...');

      // Use retry for database operations
      const headingsData = await withDatabaseRetry(() => 
        DatabaseManager.loadHeadings(TASK_ID)
      );
      
      if (!headingsData || headingsData.length === 0) {
        setError('No headings found in the database');
        return;
      }

      setHeadings(headingsData);

      // Load all tasks for all headings and store them
      const tasksByHeading: Record<number, TaskItem[]> = {};
      const allTaskStates: TaskStates = {};
      let firstUncheckedHeading = null;
      let firstHeadingTasks = null;

      // First pass: load all tasks and basic states
      for (const heading of headingsData) {
        const tasksData = await DatabaseManager.loadTasksForHeading(heading.TRANS_ID, TASK_ID);
        tasksByHeading[heading.TRANS_ID] = tasksData;
        
        // Basic initialization for all tasks
        for (const task of tasksData) {
          const { status } = await DatabaseManager.getTaskStatus(task.TRANS_ID, TASK_ID);
          const isChecked = status === 'CHECKED';
          
          allTaskStates[task.TRANS_ID] = {
            checked: isChecked,
            isValid: isChecked,
            inputValue: task.Remark || '',
            isEnabled: false, // Start with all disabled
            voltageValue: task.Actual_Voltage?.toString() || '',
            frequencyValue: task.Actual_Frequency?.toString() || '',
            partSrNo: task.Part_Sr_No || '',
            calibrationStatus: task.Caibiration_Status || '',
            voltageValid: isChecked,
            frequencyValid: isChecked,
            status: status || 'UNCHECKED'
          };
        }
      }
      
      // Always get the first heading and its tasks
      const firstHeading = headingsData[0];
      const firstHeadingTasksData = tasksByHeading[firstHeading.TRANS_ID];
      firstHeadingTasks = firstHeadingTasksData;
      
      // Second pass: handle special cases for each heading
      for (const heading of headingsData) {
        const tasksData = tasksByHeading[heading.TRANS_ID];
        
        // SPECIAL CASE: If first task is SubHead, always enable the next task
        if (tasksData.length > 1 && tasksData[0].Input_Type === 'SubHead') {
          // Find the first non-SubHead task after the initial SubHead
          const nextTaskIndex = tasksData.findIndex((t, idx) => 
            idx > 0 && t.Input_Type !== 'SubHead'
          );
          
          if (nextTaskIndex > 0) { // Found a valid next task
            const nextTask = tasksData[nextTaskIndex];
            const isNextTaskChecked = allTaskStates[nextTask.TRANS_ID]?.checked;
            
            // Only enable if not already checked
            if (!isNextTaskChecked) {
              console.log(`Enabling task ${nextTask.TRANS_ID} after initial SubHead in heading ${heading.TRANS_ID}`);
              allTaskStates[nextTask.TRANS_ID].isEnabled = true;
            }
          }
        }
        
        // Find first unchecked heading if not already found
        if (!firstUncheckedHeading && tasksData.some(task => 
          task.Input_Type !== 'SubHead' && 
          !(allTaskStates[task.TRANS_ID]?.checked)
        )) {
          firstUncheckedHeading = heading;
          // We keep the already assigned firstHeadingTasks from the first heading
        }
      }

      // Store all tasks by heading
      setAllTasksByHeading(tasksByHeading);

      // If no unchecked heading found, use first heading
      if (!firstUncheckedHeading) {
        firstUncheckedHeading = headingsData[0];
        // We keep the already assigned firstHeadingTasks from the first heading
      }

      // Ensure the first element of the first heading is enabled if it's not checked
      if (firstHeadingTasksData && firstHeadingTasksData.length > 0) {
        // Get the first non-SubHead task in the first heading
        const firstNonSubHeadTask = firstHeadingTasksData.find(task => 
          task.Input_Type !== 'SubHead'
        );
        
        if (firstNonSubHeadTask) {
          const isFirstTaskChecked = allTaskStates[firstNonSubHeadTask.TRANS_ID]?.checked;
          
          // Enable the first task if it's not already checked
          if (!isFirstTaskChecked) {
            console.log(`Enabling first task in first heading: ${firstNonSubHeadTask.TRANS_ID}`);
            allTaskStates[firstNonSubHeadTask.TRANS_ID].isEnabled = true;
          }
        }
      }

      // Before setting taskStates, apply SubHead handling
      const finalTaskStates = handleSubHeadEnabling(allTaskStates, 
        firstHeadingTasks || Object.values(tasksByHeading).flat());
      
      setTaskStates(finalTaskStates);
      setSelectedHeading(firstUncheckedHeading);
      setCurrentTasks(firstHeadingTasks || []);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [handleSubHeadEnabling]);

  // Memoize expensive calculations
  const calculateHeadingProgress = useCallback((headingId: number) => {
    // Get tasks for this heading from our preloaded data
    const headingTasks = allTasksByHeading[headingId] || [];
    
    // Filter out SubHead tasks
    const nonSubHeadTasks = headingTasks.filter(task => task.Input_Type !== 'SubHead');
    
    // Count completed tasks
    const completed = nonSubHeadTasks.filter(task => taskStates[task.TRANS_ID]?.checked).length;
    const total = nonSubHeadTasks.length;
    
    return { completed, total };
  }, [allTasksByHeading, taskStates]);

  // Make sure scroll to top works consistently with heading selection
  const scrollToTop = useCallback(() => {
    // Delay scrolling slightly to ensure the list has rendered
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        console.log('Scrolling to top of task list');
      }
    }, 150); // Slightly longer delay to ensure render completes
  }, [flatListRef]);

  // Handle heading selection with improved scroll to top
  const handleHeadingSelect = useCallback(async (heading: TaskItem) => {
    if (!heading?.TRANS_ID) {
      console.error('Invalid heading provided');
      Alert.alert('Error', 'Invalid heading selection');
      return;
    }

    if (isUpdating) return;

    try {
      setIsUpdating(true);
      setError(null);
      setSelectedHeading(heading);

      // Use retry for database operations
      const tasksData = await withDatabaseRetry(() => 
        DatabaseManager.loadTasksForHeading(heading.TRANS_ID, TASK_ID)
      );
      
      if (!Array.isArray(tasksData)) throw new Error('Invalid tasks data received');

      setCurrentTasks(tasksData);
      const newStates = await initializeTaskStates(tasksData);
      setTaskStates((prevStates) => ({ ...prevStates, ...newStates }));
      
      // Use the scrollToTop function
      scrollToTop();
    } catch (err) {
      console.error('Error loading tasks for heading:', err);
      setError('Failed to load tasks for this heading');
      Alert.alert('Error', 'Failed to load tasks for this heading');
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, initializeTaskStates, scrollToTop]);

  // Helper function to find the next actionable task
  const findNextActionableTask = (tasks: TaskItem[], currentIndex: number): TaskItem | null => {
    for (let i = currentIndex + 1; i < tasks.length; i++) {
      if (tasks[i].Input_Type !== 'SubHead') {
        return tasks[i];
      }
    }
    return null;
  };

  // Update the handleTaskToggle function for more reliable updates
  const handleTaskToggle = useCallback(async (transId: number) => {
    try {
      const task = currentTasks.find(t => t.TRANS_ID === transId);
      if (!task) {
        console.error(`Task with ID ${transId} not found`);
        return;
      }
      
      // Get current state
      const currentState = taskStates[transId];
      const newCheckedState = !currentState?.checked;
      const newStatus = newCheckedState ? 'CHECKED' : 'UNCHECKED';
      
      // Log the intended change
      console.log(`Toggling task ${transId} from ${currentState?.checked ? 'CHECKED' : 'UNCHECKED'} to ${newStatus}`);
      
      // Immediately update local state first for responsive UI
      setTaskStates(prev => {
        const currentIndex = currentTasks.findIndex((t) => t.TRANS_ID === task.TRANS_ID);
        
        // Find the next actionable task (skipping SubHeads)
        const nextActionableTask = currentTasks.slice(currentIndex + 1)
          .find(t => t.Input_Type !== 'SubHead');
        
        const updates: TaskStates = {
          [task.TRANS_ID]: {
            ...prev[task.TRANS_ID],
            checked: newCheckedState,
            isValid: newCheckedState,
            status: newStatus
          }
        };

        // If current task is checked, enable the next task
        if (newCheckedState && nextActionableTask) {
          updates[nextActionableTask.TRANS_ID] = {
            ...prev[nextActionableTask.TRANS_ID],
            isEnabled: true
          };
        }

        // Apply SubHead handling to catch any edge cases
        return handleSubHeadEnabling({ ...prev, ...updates }, currentTasks);
      });
      
      // Then update the database
      await withDatabaseRetry(() => 
        DatabaseManager.updateTaskStatus(task.TRANS_ID, newStatus, TASK_ID)
      );
      
      console.log(`Database updated for task ${transId}: status set to ${newStatus}`);
      
      // Verify database update was successful with retry
      const verifyStatus = await withDatabaseRetry(() => 
        DatabaseManager.getTaskStatus(task.TRANS_ID, TASK_ID)
      );
      
      // If database update failed or is inconsistent, try to fix it
      if (verifyStatus.status !== newStatus) {
        console.warn(`Database status mismatch for task ${transId}. Retrying update...`);
        await withDatabaseRetry(() => 
          DatabaseManager.updateTaskStatus(task.TRANS_ID, newStatus, TASK_ID)
        );
      }
      
      // Check if this was the last task
      if (currentTasks.length > 0 && transId === currentTasks[currentTasks.length - 1].TRANS_ID) {
        const taskStatus = await DatabaseManager.getTaskStatus(transId, TASK_ID);
        setLastTaskCompletedInDB(taskStatus.status === 'CHECKED');
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      // Attempt to recover from error by syncing with database
      try {
        const task = currentTasks.find(t => t.TRANS_ID === transId);
        if (task) {
          const { status } = await DatabaseManager.getTaskStatus(task.TRANS_ID, TASK_ID);
          const isChecked = status === 'CHECKED';
          
          // Update UI to match database
          setTaskStates(prev => {
            const updates = {
              [transId]: {
                ...prev[transId],
                checked: isChecked,
                isValid: isChecked,
                status: status || 'UNCHECKED'
              }
            };
            return handleSubHeadEnabling({ ...prev, ...updates }, currentTasks);
          });
          
          console.log(`Recovered state for task ${transId}: set to ${status}`);
        }
      } catch (recoveryError) {
        console.error('Failed to recover from toggle error:', recoveryError);
        Alert.alert('Error', 'There was a problem updating the task. Please try again.');
      }
    }
  }, [taskStates, DatabaseManager, TASK_ID, setTaskStates, handleSubHeadEnabling, currentTasks]);

  // Update other input type handlers (VoltFreq, Voltage, etc.) to use similar logic
  const handleVoltFreqUpdate = useCallback(async (transId: number, voltageValue: string, frequencyValue: string) => {
    const task = currentTasks.find(t => t.TRANS_ID === transId);
    if (!task) return;

    const currentIndex = currentTasks.findIndex((t) => t.TRANS_ID === task.TRANS_ID);
    const nextActionableTask = findNextActionableTask(currentTasks, currentIndex);

    const isValid = validateInput(task, voltageValue, 'voltage') && 
                   validateInput(task, frequencyValue, 'frequency');

    if (isValid) {
      try {
        await withDatabaseRetry(() => 
          Promise.all([
            DatabaseManager.updateVoltFreqValues(transId, voltageValue, frequencyValue, TASK_ID),
            DatabaseManager.updateTaskStatus(transId, 'CHECKED', TASK_ID)
          ])
        );

        setTaskStates(prev => {
          const updates: TaskStates = {
            [transId]: {
              ...prev[transId],
              checked: true,
              isValid: true,
              voltageValue,
              frequencyValue,
              status: 'CHECKED'
            }
          };

          if (nextActionableTask) {
            updates[nextActionableTask.TRANS_ID] = {
              ...prev[nextActionableTask.TRANS_ID],
              isEnabled: true
            };
          }

          return { ...prev, ...updates };
        });
      } catch (error) {
        console.error('Failed to update volt/freq values:', error);
      }
    }
  }, [DatabaseManager, TASK_ID, taskStates, setTaskStates, currentTasks, findNextActionableTask, validateInput]);

  // Add this utility function near the top of the file, after the imports
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Add a debounced update function with a consistent delay
  const debouncedDatabaseUpdate = debounce(async (
    transId: number,
    value: string,
    inputType: string,
    updateFunction: () => Promise<void>
  ) => {
    if (!transId || operationLoading[transId]) return;

    setOperationLoading(prev => ({ ...prev, [transId]: true }));
    try {
      await updateFunction();
      
      // Find the next task
      const currentIndex = currentTasks.findIndex(t => t.TRANS_ID === transId);
      const nextTask = currentTasks[currentIndex + 1];

      setTaskStates(prev => ({
        ...prev,
        [transId]: {
          ...prev[transId],
          inputValue: value,
          isValid: true,
          checked: !!value.trim(),
          status: value.trim() ? 'CHECKED' : 'UNCHECKED'
        },
        ...(nextTask && value.trim() ? {
          [nextTask.TRANS_ID]: {
            ...prev[nextTask.TRANS_ID],
            isEnabled: true
          }
        } : {})
      }));
    } catch (err) {
      console.error('Failed to update input:', err);
      Alert.alert('Error', 'Failed to update input value');
    } finally {
      setOperationLoading(prev => ({ ...prev, [transId]: false }));
    }
  }, 1000); // 1 second delay for all inputs



  // Handle next heading
// Update handleNextHeading function
const handleNextHeading = useCallback(async () => {
  if (!selectedHeading || isUpdating) return;

  const currentIndex = headings.findIndex((h) => h.TRANS_ID === selectedHeading.TRANS_ID);
  if (currentIndex === -1 || currentIndex >= headings.length - 1) return;

  setIsUpdating(true);
  try {
    const nextHeading = headings[currentIndex + 1];
    const tasksData = await DatabaseManager.loadTasksForHeading(nextHeading.TRANS_ID, TASK_ID);
    
    // Check if first element is SubHead
    const isFirstElementSubHead = tasksData.length > 0 && tasksData[0].Input_Type === 'SubHead';
    
    let updatedStates: TaskStates = {};
    
    if (isFirstElementSubHead) {
      // Find first non-SubHead task in the heading
      const firstNonSubHeadTask = tasksData.find((task, index) => 
        index > 0 && task.Input_Type !== 'SubHead'
      );
      
      if (firstNonSubHeadTask) {
        console.log(`First element is SubHead. Enabling next non-SubHead task: ${firstNonSubHeadTask.TRANS_ID}`);
        
        updatedStates = {
          ...taskStates,
          [firstNonSubHeadTask.TRANS_ID]: {
            ...taskStates[firstNonSubHeadTask.TRANS_ID],
            isEnabled: true
          }
        };
      } else {
        console.warn('No non-SubHead task found in the next heading');
        updatedStates = taskStates; // Keep current state if no non-SubHead found
      }
    } else if (tasksData.length > 0) {
      // Normal case: First element is not SubHead
      const firstTask = tasksData[0];
      
      updatedStates = {
        ...taskStates,
        [firstTask.TRANS_ID]: {
          ...taskStates[firstTask.TRANS_ID],
          isEnabled: true
        }
      };
    }
    
    // Apply SubHead handling to catch any edge cases
    const finalStates = handleSubHeadEnabling(updatedStates, tasksData);
    setTaskStates(finalStates);
    
    setSelectedHeading(nextHeading);
    setCurrentTasks(tasksData);
    
    // Scroll to top when moving to next heading
    scrollToTop();
  } catch (err) {
    console.error('Failed to move to next heading:', err);
    Alert.alert('Error', 'Failed to proceed to next heading');
  } finally {
    setIsUpdating(false);
  }
}, [selectedHeading, headings, isUpdating, TASK_ID, taskStates, handleSubHeadEnabling, scrollToTop]);

  // Initial load
  useEffect(() => {
    loadHeadingsAndTasks();
  }, [loadHeadingsAndTasks]);

  useEffect(() => {
    if (route.params?.dbFile) {
      DatabaseManager.setCurrentDbFile(route.params.dbFile);
    }
  }, [route.params?.dbFile]);

  // Add debugging useEffect
  useEffect(() => {
    const inputTasks = currentTasks.filter(task => task.Input_Type === 'Input');
    console.log('Input type tasks with their states:', inputTasks.map(task => ({
      TRANS_ID: task.TRANS_ID,
      Remark: task.Remark,
      state: taskStates[task.TRANS_ID]
    })));
  }, [currentTasks, taskStates]);

  // Add this useEffect to check the last task's status in the database
  useEffect(() => {
    const checkLastTaskStatus = async () => {
      if (!currentTasks.length || !selectedHeading) {
        setLastTaskCompletedInDB(false);
        return;
      }
      
      // Get the last task in the current tasks array
      const lastTask = currentTasks[currentTasks.length - 1];
      
      try {
        // Check the database status of the last task
        const taskStatus = await DatabaseManager.getTaskStatus(lastTask.TRANS_ID, route.params.taskId);
        setLastTaskCompletedInDB(taskStatus.status === 'CHECKED');
      } catch (error) {
        console.error('Failed to check last task status:', error);
        setLastTaskCompletedInDB(false);
      }
    };
    
    checkLastTaskStatus();
  }, [currentTasks, selectedHeading, route.params.taskId]);

  // Add a useEffect to scroll to top whenever currentTasks changes
  useEffect(() => {
    if (currentTasks.length > 0) {
      scrollToTop();
    }
  }, [currentTasks, scrollToTop]);

  // Optimize the FlatList with getItemLayout
  const getItemLayout = useCallback((_: any, index: number) => {
    const ITEM_HEIGHT = 88; // Adjust based on your actual item height
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    };
  }, []);

  const keyExtractor = useCallback((item: TaskItem) => `task-${item.TRANS_ID}`, []);

  // Optimize the areAllTasksCompleted function
  const checkAllTasksCompleted = useCallback((headings: TaskItem[], selectedHeading: TaskItem | null, currentTasks: TaskItem[], taskStates: TaskStates): boolean => {
    // Early exit if not the last heading
    if (!selectedHeading || headings.length === 0) return false;
    
    const isLastHeading = headings[headings.length - 1]?.TRANS_ID === selectedHeading.TRANS_ID;
    if (!isLastHeading) return false;
    
    // Quick check for any incomplete tasks with early return
    for (const task of currentTasks) {
      const state = taskStates[task.TRANS_ID];
      if (!state) return false; // Missing state counts as incomplete
      
      if (task.Input_Type === 'Check' && !state.checked) return false;
      if (['Input', 'Volt', 'Freq', 'VoltFreq', 'PartSerial', 'PhaseSeq'].includes(task.Input_Type) && !state.isValid) {
        return false;
      }
    }
    return true;
  }, []);

  // Memoize sidebar props to prevent re-renders
  const sidebarProps = useMemo(() => ({
    headings,
    selectedHeading,
    onSelectHeading: handleHeadingSelect,
    isCollapsed: isSidebarCollapsed,
    onToggleCollapse: () => setIsSidebarCollapsed(!isSidebarCollapsed),
    taskStates,
    calculateHeadingProgress
  }), [headings, selectedHeading, handleHeadingSelect, isSidebarCollapsed, taskStates, calculateHeadingProgress]);

  // Define handleInputChange function
  const handleInputChange = useCallback((transId: number, value1: string, value2?: string) => {
    if (value2 !== undefined) {
      // Handle phase sequence inputs
      setTaskStates(prev => ({
        ...prev,
        [transId]: {
          ...prev[transId],
          voltageValue: value1,
          frequencyValue: value2
        }
      }));
    } else {
      // Handle single input value
      setTaskStates(prev => ({
        ...prev,
        [transId]: {
          ...prev[transId],
          inputValue: value1
        }
      }));
    }
  }, [setTaskStates]);

  // Render task item
  const renderTask = useCallback(({ item }: { item: TaskItem }) => (
    <View style={styles.taskItemContainer}>
      <TaskItem
        task={item}
        state={taskStates[item.TRANS_ID] || {
          checked: false,
          isValid: false,
          inputValue: '',
          isEnabled: false,
        }}
        onToggle={handleTaskToggle}
        onInputChange={handleInputChange}
        setTaskStates={setTaskStates}
        currentTasks={currentTasks}
        TASK_ID={TASK_ID}
        onStateChange={onStateChange}
        taskStates={taskStates}
      />
    </View>
  ), [taskStates, handleTaskToggle, handleInputChange, setTaskStates, currentTasks, TASK_ID, onStateChange]);

  // Loading state
  if (loading) {
    return (
      <LinearGradient
        colors={[colors.light.primary, colors.light.secondary, colors.light.tertiary]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{flex: 1}}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (error) {
    return (
      <LinearGradient
        colors={[colors.light.primary, colors.light.secondary, colors.light.tertiary]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{flex: 1}}
      >
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHeadingsAndTasks}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Then replace the Next button with this conditional rendering
  {selectedHeading && lastTaskCompletedInDB && (
    checkAllTasksCompleted(headings, selectedHeading, currentTasks, taskStates) ? (
      <TouchableOpacity
        style={[styles.nextButton, styles.homeButton]}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.nextButtonText}>Home</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[
          styles.nextButton, 
          isUpdating && styles.nextButtonDisabled,
          styles.compactNextButton
        ]}
        onPress={handleNextHeading}
        disabled={isUpdating}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    )
  )}

  // Main render
  return (
    <LinearGradient
      colors={[colors.light.primary, colors.light.secondary, colors.light.tertiary]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={{flex: 1}}
    >
      <View style={styles.container}>
        {!isMobile && (
          <Sidebar {...sidebarProps} />
        )}

        <View style={[
          styles.mainContent,
          { marginLeft: isMobile ? 0 : isSidebarCollapsed ? 60 : SIDEBAR_WIDTH }
        ]}>
          {/* Logo Box - Similar to LoginPage */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.dark.primary, colors.dark.secondary]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.logoBackground}
            >
              {/* Animated rings could go here - simplified for now */}
              <View style={styles.logoGlow}>
                <Text style={styles.logoText}>IRS</Text>
                <Text style={styles.logoSubText}>INSPECTION RECORD SYSTEM</Text>
              </View>
            </LinearGradient>
          </View>
          
          <FlatList
            data={currentTasks}
            renderItem={renderTask}
            keyExtractor={(item) => `task-${item.TRANS_ID}`}
            getItemLayout={(_data, index) => ({
              length: 88, // Adjust based on your item height
              offset: 88 * index,
              index,
            })}
            windowSize={5}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
            initialNumToRender={10}
            contentContainerStyle={styles.taskList}
            
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Select a heading to view tasks</Text>
              </View>
            }
            ref={flatListRef}
          />
        </View>
      </View>
    </LinearGradient>
  );
};




const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  sidebar: {
    backgroundColor: '#F8FAFC',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 100,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  sidebarHeader: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseButtonText: {
    color: '#64748B',
    fontSize: 33,
  },
  navList: {
    flex: 1,
  },
  navItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 8,
  },
  navItemSelected: {
    backgroundColor: '#EDF2F7',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  expandedNavContent: {
    gap: 8,
  },
  headingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 8,
    minWidth: 24,
  },
  headingTitle: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
  headingTitleSelected: {
    color: '#0F172A',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressFillComplete: {
    backgroundColor: '#10B981',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusComplete: {
    backgroundColor: '#D1FAE5',
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusPending: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  taskList: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 24,
  },
  taskItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  input: {
    height: scale(48),
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    fontSize: scale(16),
    backgroundColor: colors.glass.background,
    color: colors.text.primary,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputDisabled: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderColor: colors.light.tertiary,
    color: colors.text.muted,
    opacity: 0.7,
  },
  inputError: {
    borderColor: colors.status.error,
    backgroundColor: 'rgba(251, 113, 133, 0.1)',
  },
  validInput: {
    borderColor: colors.status.success,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: scale(16),
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: scale(16),
    color: colors.status.error,
    marginBottom: scale(16),
  },
  retryButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(12),
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  retryButtonText: {
    color: colors.text.light,
    fontSize: scale(16),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: scale(20),
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: scale(16),
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  nextButton: {
    backgroundColor: colors.accent.primary,
    padding: scale(12),
    margin: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: scale(130),
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonDisabled: {
    backgroundColor: colors.text.muted,
    shadowOpacity: 0.1,
  },
  nextButtonText: {
    color: colors.text.light,
    fontSize: scale(14),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  compactNextButton: {
    marginTop: scale(8),
    paddingVertical: scale(8),
  },
  homeButton: {
    backgroundColor: colors.status.success,
  },
  inputContainer: {
    marginBottom: scale(16),
    width: '100%',
  },
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: scale(6),
    letterSpacing: 0.5,
  },
  unitText: {
    fontSize: scale(14),
    color: colors.text.secondary,
    marginLeft: scale(8),
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingRight: scale(12),
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: scale(12),
    backdropFilter: 'blur(3px)',
  },
  taskHeading: {
    fontSize: scale(18),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: scale(16),
    marginTop: scale(24),
    letterSpacing: 0.5,
  },
  statusIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(8),
  },
  statusIndicatorComplete: {
    backgroundColor: colors.status.success,
  },
  statusIndicatorPending: {
    backgroundColor: colors.status.warning,
  },
  helperText: {
    fontSize: scale(12),
    color: colors.text.secondary,
    marginTop: scale(4),
    marginLeft: scale(4),
  },
  taskSection: {
    flex: 1,
    padding: scale(16),
  },
  topicList: {
    flex: 1,
  },
  topicItem: {
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  selectedTopicItem: {
    backgroundColor: '#e3f2fd',
  },
  topicText: {
    fontSize: 16,
  },
  topicSelector: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border
  },
  topicButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0'
  },
  selectedTopicButton: {
    backgroundColor: '#007AFF'
  },
  topicButtonText: {
    color: '#333',
    fontSize: 14
  },
  selectedTopicButtonText: {
    color: '#fff'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  taskName: {
    fontSize: 16,
    flex: 1,
    marginRight: 10
  },
  voltageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uomText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  sidebarItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sidebarItemSelected: {
    backgroundColor: '#e0e0e0',
  },
  sidebarText: {
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  subHeadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginVertical: 8,
    width: '100%',
  },
  subHeadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subHeadLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#94a3b8',
    opacity: 0.5,
  },
  checkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
  },

  voltFreqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEF2F2',
  },
  skSection: {
    flex: 1,
    padding: 16,
  },
  noteContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  noteText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
  },
  remarkText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  voltageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative', // Required for overlay positioning
    flexDirection: 'row',
    alignItems: 'center',
  },

  invalidInput: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  unit: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 8,
  },
  taskItemContainer: {
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsSection: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    alignItems: 'center',
  },
  detailLabel: {
    width: 140,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  partSerialWrapper: {
    padding: 8,
    width: '100%',
  },
  partSerialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  partSerialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 20,
  },
  partSerialGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 20,
    flexWrap: 'wrap',
  },
  partSerialField: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    minWidth: Platform.OS === 'web' ? 300 : '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  requiredText: {
    fontSize: 12,
    color: '#E53E3E',
    fontWeight: '500',
  },
  modernInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#2D3748',
    width: '100%',
  },
  inputStatusIndicator: {
    position: 'absolute',
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    top: '50%',
    transform: [{ translateY: -4 }],
  },
  statusMessage: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  validMessage: {
    backgroundColor: '#F0FFF4',
    color: '#48BB78',
  },
  invalidMessage: {
    backgroundColor: '#FFF5F5',
    color: '#E53E3E',
  },
  miniProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 4,
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6', 
    borderRadius: 2,
  },
  statusIndicatorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    alignItems: 'center',
  },
// Update checkbox styles
checkbox: {
  width: 28,
  height: 28,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: '#CBD5E0',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
},
checkboxChecked: {
  backgroundColor: '#10B981', // Bright green for active state
  borderColor: '#059669',
},
checkboxDisabledUnchecked: {
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  borderColor: '#E2E8F0',
  opacity: 0.7,
},
checkboxDisabledChecked: {
  backgroundColor: 'rgba(16, 185, 129, 0.3)',
  borderColor: 'rgba(5, 150, 105, 0.3)',
  opacity: 0.7,
},
checkmark: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: '900',
},

  collapsedNavContent: {
    alignItems: 'center',
  },
  navInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  headingProgressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  collapsedHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  collapsedButton: {
    margin: 0,
    width: 40,
    height: 40,
  },
  equipmentDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  equipmentDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  equipmentDetailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  connectorsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  connectorsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  connectorsValue: {
    fontSize: 14,
    color: '#4B5563',
  },
  inputValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  pinsConnectorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinsText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  connectorsText: {
    fontSize: 14,
    color: '#666',
  },
  checkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  phaseSeqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  phaseSeqLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  phaseSeqInputContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  phaseSeqInputWrapper: {
    flex: 1,
  },

  phaseSeqInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  phaseSeqInputMatched: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  phaseSeqInputChecking: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  checkingIndicator: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  checkingText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  matchedIndicator: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    alignItems: 'center',
  },
  matchedText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  mismatchIndicator: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignItems: 'center',
  },
  mismatchText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  voltFreqTaskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  voltFreqInputsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  voltFreqInputGroup: {
    flex: 1,
    minWidth: 200,
  },
  voltFreqLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  voltFreqInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voltFreqInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  voltFreqUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    minWidth: 30,
  },
  voltFreqStatusContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    alignItems: 'center',
  },
  voltFreqStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  validStatusMessage: {
    color: '#10B981', // Green shade
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#ECFDF5', // Light green background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  invalidStatusMessage: {
    color: '#DC2626', // Red shade
    fontSize: 14,
    fontWeight: '500',
  },
  componentDisabledOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cameraButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voltFreqCameraButton: {
    marginLeft: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  cameraIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  previewModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginVertical: 15,
    backgroundColor: '#f0f0f0',
  },
  previewImagePlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginVertical: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  previewButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  previewButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  previewButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  inputWithCamera: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  viewImageButton: {
    backgroundColor: '#10B981', // Green color for view button
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  inputValidRange: {
    backgroundColor: '#e6f7e6', // Light green background for valid input
    borderColor: '#4CAF50',     // Green border
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
    padding: 3,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginTop: 8,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    overflow: 'hidden',
  },
  logoGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    padding: 10,
  },
  logoText: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  logoSubText: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});

// Add this hook before the TaskListScreen component
const useKeyboardHandling = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return isKeyboardVisible;
};

// Add this utility function at the top level of your file - outside components
const useCameraFunctionality = (task: TaskItem, inputType: string, state?: TaskState, TASK_ID?: number) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [viewSavedImage, setViewSavedImage] = useState(false);
  const [savedImagePath, setSavedImagePath] = useState<string | null>(null);
  
  // Image directory path
  const IMAGE_DIRECTORY = `${RNFS.DownloadDirectoryPath}/App/Images`;

  // Check for previously saved image on component mount
  useEffect(() => {
    checkForSavedImage();
  }, []);

  // Function to check for a previously saved image
  const checkForSavedImage = async () => {
    try {
      // Generate the correct filename format that includes all components
      const fileName = `${TASK_ID}_${task.TRANS_ID}_${task.Ac_No}_${inputType}.jpg`;
      const imagePath = `${IMAGE_DIRECTORY}/${fileName}`;
      const exists = await RNFS.exists(imagePath);
      
      if (exists) {
        // Use file:// prefix for local files to ensure proper URI format
        setSavedImagePath(`file://${imagePath}`);
        console.log(`Found saved image at: file://${imagePath}`);
      } else {
        console.log(`No saved image found at ${imagePath}`);
        setSavedImagePath(null);
      }
    } catch (error) {
      console.error('Error checking for saved image:', error);
      setSavedImagePath(null);
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs access to your camera to capture images",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert("Permission Denied", "Camera permission is required to use this feature");
        return false;
      }
    } catch (err) {
      console.error("Error requesting camera permission:", err);
      return false;
    }
  };

  // Handle camera launch
  const handleCameraPress = async () => {
    // Check if state is disabled (if state is provided)
    if (state && !state.isEnabled) {
      Alert.alert("Error", "Complete previous tasks first");
      return;
    }
    
    // Request camera permission
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    
    try {
      // Create directory if it doesn't exist
      const dirExists = await RNFS.exists(IMAGE_DIRECTORY);
      if (!dirExists) {
        await RNFS.mkdir(IMAGE_DIRECTORY);
      }
      
      // Launch camera
      launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      }, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorCode) {
          console.error('Camera Error: ', response.errorMessage);
          Alert.alert('Camera Error', response.errorMessage || 'Unknown error occurred');
        } else if (response.assets && response.assets[0]?.uri) {
          // Set captured image and show preview
          setCapturedImage(response.assets[0].uri);
          setShowImagePreview(true);
        }
      });
    } catch (error) {
      console.error('Failed to launch camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  // Function to view the saved image
  const handleViewSavedImage = () => {
    if (savedImagePath) {
      setViewSavedImage(true);
    } else {
      Alert.alert('No Image', 'No saved image found for this task');
    }
  };

  // Save captured image
  const saveImage = async () => {
    if (!capturedImage) return;
    
    try {
      // Generate filename with task ID, acNo, and taskId for better organization
      const fileName = `${TASK_ID}_${task.TRANS_ID}_${task.Ac_No}_${inputType}.jpg`;
      const destPath = `${IMAGE_DIRECTORY}/${fileName}`;
      
      // Copy the temporary image to our storage location
      await RNFS.copyFile(capturedImage, destPath);
      
      // Update the saved image path with file:// prefix for proper URI format
      setSavedImagePath(`file://${destPath}`);
      
      // Show success message
      ToastAndroid.show('Image saved successfully', ToastAndroid.SHORT);
      
      // Close the preview
      setShowImagePreview(false);
      
      // Save to device gallery as well
      try {
        await CameraRoll.save(capturedImage, { type: 'photo' });
      } catch (galleryError) {
        console.log('Could not save to gallery:', galleryError);
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
      setShowImagePreview(false);
    }
  };

  // Camera button component
  const CameraButton = ({ disabled = false }) => {
    return (
      <View style={styles.cameraButtonContainer}>
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={handleCameraPress}
          disabled={disabled}
        >
          <SimpleLineIcons name="camera" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        {savedImagePath && (
          <TouchableOpacity 
            style={styles.viewImageButton} 
            onPress={handleViewSavedImage}
          >
            <SimpleLineIcons name="eye" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Image preview modal component
  const ImagePreviewModal = () => {
    return (
      <Modal
        visible={showImagePreview || viewSavedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (showImagePreview) setShowImagePreview(false);
          if (viewSavedImage) setViewSavedImage(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePreviewContainer}>
            <Text style={styles.previewTitle}>
              {showImagePreview ? 'Captured Image' : 'Saved Image'}
            </Text>
            
            {(capturedImage || savedImagePath) && (
              <Image 
                source={{ uri: (viewSavedImage ? savedImagePath : capturedImage) || '' }} 
                style={styles.previewImage} 
                resizeMode="contain"
              />
            )}
            
            <View style={styles.previewButtonsContainer}>
              <TouchableOpacity
                style={[styles.previewButton, styles.rejectButton]}
                onPress={() => {
                  if (showImagePreview) setShowImagePreview(false);
                  if (viewSavedImage) setViewSavedImage(false);
                }}
              >
                <Text style={styles.previewButtonText}>Close</Text>
              </TouchableOpacity>
              
              {showImagePreview && (
                <TouchableOpacity
                  style={[styles.previewButton, styles.acceptButton]}
                  onPress={saveImage}
                >
                  <Text style={styles.previewButtonText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return {
    CameraButton,
    ImagePreviewModal,
    handleCameraPress,
    capturedImage,
    showImagePreview,
    setShowImagePreview,
    savedImagePath,
    viewSavedImage,
    setViewSavedImage
  };
};

// Add this utility function if not already present
const withDatabaseRetry = async <T,>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('No database connection available')) {
        console.log(`Database connection error, retrying (${attempt}/${maxRetries})...`);
        // Wait before retrying (increasing delay for each attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }
      // For other errors, don't retry
      throw error;
    }
  }
  console.error(`Failed after ${maxRetries} retries`);
  throw lastError;
};

export default TaskListScreen;