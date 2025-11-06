import CountUp from 'react-countup';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, a, color, Icon, trendData }) => (
  <div className={`p-6 rounded-lg shadow-md ${color || 'bg-white'}`}>
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-md font-semibold text-gray-600">{title}</h2>
      <Icon className="h-6 w-6 text-blue-600" />
    </div>
    <div className="text-3xl font-bold">
      {a}
      <CountUp start={0} end={value} duration={1.5} separator="," />
    </div>

    {trendData && (
      <div className="h-12 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);
