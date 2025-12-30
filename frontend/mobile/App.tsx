import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, DollarSign, FileText, Settings } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: '#6366f1',
                    tabBarStyle: { height: 90, paddingBottom: 30 },
                }}
            >
                <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({color}) => <Home color={color} size={28} /> }} />
                <Tab.Screen name="Accounting" component={AccountingScreen} options={{ tabBarIcon: ({color}) => <DollarSign color={color} size={28} /> }} />
                <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: ({color}) => <FileText color={color} size={28} /> }} />
            </Tab.Navigator>
        </NavigationContainer>
    );
}