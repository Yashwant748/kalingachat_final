
import axios from 'axios';

async function check() {
    try {
        const res = await axios.get('http://localhost:5000/api/health');
        console.log('Health Check:', res.data);
    } catch (e: any) {
        console.error('Health Check Failed:', e.message);
    }
}
check();
