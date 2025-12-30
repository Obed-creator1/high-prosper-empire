import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function CollectorHome() {
    const [customers, setCustomers] = useState([]);
    const [collectorStats, setCollectorStats] = useState({});
    const balance = useHPCBalance(); // Real-time, satellite-synced

    useEffect(() => {
        const token = AsyncStorage.getItem('token');
        axios.defaults.headers.common['Authorization'] = `Token ${token}`;

        axios.get('http://your-backend.com/api/v1/customers/collector-summary/')
            .then(res => {
                const myData = res.data.find((c: any) => c.collector_name === "John Collector");
                setCollectorStats(myData);
                // Load today's route
                axios.get('/api/v1/customers/customers/?village__collectors__username=me&ordering=risk_score')
                    .then(res => setCustomers(res.data.results));
            });
    }, []);

    return (
        <View className="bg-gradient-to-b from-purple-900 to-black h-full">
            <Text className="text-6xl text-white text-center mt-20 font-bold">
                HPC {balance.toLocaleString()}
            </Text>
            <Text className="text-center text-yellow-400 text-2xl mt-4">
                {balance > 1000000 ? "You're rich!" : "Keep collecting"}
            </Text>

            <View className="flex-row justify-around mt-20">
                <TouchableOpacity onPress={() => payBillWithVoice()}>
                    <Mic className="w-20 h-20 text-white" />
                    <Text className="text-white">Speak to Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openQRScanner}>
                    <QrCode className="w-20 h-20 text-white" />
                    <Text className="text-white">Scan & Pay</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
        <View className="p-4">
            <Text className="text-3xl font-bold text-purple-600">Good Morning, John!</Text>
            <Text className="text-xl mt-2">Today’s Target: RWF 850,000</Text>

            <View className="bg-red-100 p-4 rounded-xl mt-4">
                <Text className="text-red-800 font-bold">High Risk Customers: 12</Text>
            </View>

            <FlatList
                data={customers}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                    <TouchableOpacity className={`p-4 my-2 rounded-lg ${item.risk_score > 70 ? 'bg-red-100' : 'bg-white'} border`}>
                        <Text className="font-bold">{item.name}</Text>
                        <Text>Balance: RWF {item.balance?.toLocaleString()}</Text>
                        <Text className="text-sm text-gray-600">
                            {item.risk_score > 70 ? 'CRITICAL' : 'Normal'} Risk
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}