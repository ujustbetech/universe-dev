import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';


    const data = {
      labels: ['January', 'February', 'March', 'April', 'May'],
      datasets: [
        {
          label: 'Sales',
          data: [12, 19, 3, 5, 2],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

        const BarChart = () => {
      return <Bar data={data} />;
    };

    export default BarChart;