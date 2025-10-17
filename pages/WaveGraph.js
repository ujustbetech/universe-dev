    import { Line } from 'react-chartjs-2';
    import { Chart, registerables } from 'chart.js';
    Chart.register(...registerables);

        const data = {
      labels: Array.from({ length: 50 }, (_, i) => i), // X-axis labels (e.g., time points)
      datasets: [
        {
          label: 'Wave Data',
          data: Array.from({ length: 50 }, () => Math.random() * 20 + 5*Math.sin(Math.PI*10/50)), // Random wave-like data
          borderColor: 'blue',
          borderWidth: 2,
          pointRadius: 0, // Hide data points
          tension: 0.4, // Curve tension (adjust for smoother/sharper waves)
          fill: false, // Disable filling area under the line
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Amplitude',
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend
        },
      },
    };

        const WaveChart = () => {
      return <Line data={data} options={options} />;
    };

    export default WaveChart;