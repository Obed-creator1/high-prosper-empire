'use client'
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function CustomersTable(){
  const [customers,setCustomers]=useState([]);
  useEffect(()=>{ axios.get('http://127.0.0.1:8000/api/customers/').then(r=>setCustomers(r.data)).catch(()=>setCustomers([])) },[]);
  return (
    <div style={{padding:20}}>
      <h2>Customers</h2>
      <table border="1" cellPadding="8">
        <thead><tr><th>ID</th><th>Name</th><th>Account</th><th>Sector</th><th>Cell</th><th>Village</th><th>Monthly Fee</th><th>Outstanding</th></tr></thead>
        <tbody>
          {customers.map(c=>(
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.names}</td>
              <td>{c.account_number}</td>
              <td>{c.sector}</td>
              <td>{c.cell}</td>
              <td>{c.village}</td>
              <td>{c.monthly_fee}</td>
              <td>{c.outstanding}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
