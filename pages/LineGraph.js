import { Line } from "react-chartjs-2";
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
         {
          label: 'Tales',
          data: [18, 12, 13, 15, 12],
          backgroundColor: 'rgba(192, 122, 75, 0.2)',
          borderColor: 'rgb(192, 104, 75)',
          borderWidth: 1,
        },
      ],
    };

        const LineChart = () => {
      return <Line data={data} />;
    };

    export default LineChart;
  