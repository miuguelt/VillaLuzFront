import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { COLORS } from '@/shared/utils/colors';
import { calculateBMI } from '@/shared/utils/animalMetrics';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ControlData {
    checkup_date: string;
    weight?: number;
    height?: number;
}

interface AnimalMetricsChartsProps {
    controls: ControlData[];
}

export const AnimalMetricsCharts: React.FC<AnimalMetricsChartsProps> = ({ controls }) => {
    const sortedControls = [...controls].sort(
        (a, b) => new Date(a.checkup_date).getTime() - new Date(b.checkup_date).getTime()
    );

    const labels = sortedControls.map((c) => {
        const d = new Date(c.checkup_date);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    });

    const weightData = {
        labels,
        datasets: [
            {
                label: 'Peso (kg)',
                data: sortedControls.map((c) => c.weight || null),
                borderColor: COLORS.charts.primary,
                backgroundColor: COLORS.charts.primary + '33',
                fill: true,
                tension: 0.3,
            },
        ],
    };

    const heightData = {
        labels,
        datasets: [
            {
                label: 'Altura (m)',
                data: sortedControls.map((c) => c.height || null),
                borderColor: COLORS.charts.secondary,
                backgroundColor: COLORS.charts.secondary + '33',
                fill: true,
                tension: 0.3,
            },
        ],
    };

    const bmiData = {
        labels,
        datasets: [
            {
                label: 'IMC',
                data: sortedControls.map((c) => calculateBMI(c.weight, c.height)),
                borderColor: COLORS.charts.success,
                backgroundColor: COLORS.charts.success + '33',
                fill: true,
                tension: 0.3,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    boxWidth: 8,
                    usePointStyle: true,
                    font: { size: 10 }
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    display: true,
                    color: 'rgba(0,0,0,0.05)',
                },
            },
            x: {
                grid: {
                    display: false,
                },
            },
        },
    };

    if (controls.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-muted-foreground italic text-sm">
                No hay datos de controles para generar gráficos.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="h-48">
                <Line data={weightData} options={options} title="Evolución del Peso" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-40">
                    <Line data={heightData} options={options} title="Evolución de la Altura" />
                </div>
                <div className="h-40">
                    <Line data={bmiData} options={options} title="Evolución del IMC" />
                </div>
            </div>
        </div>
    );
};
