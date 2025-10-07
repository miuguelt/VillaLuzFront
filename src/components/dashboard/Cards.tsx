import { Card, CardHeader, CardContent as CardBody } from "@/components/ui/card";
import { useState } from "react";
import { lazy, Suspense } from 'react';
const GeneticTreeModal = lazy(() => import('./GeneticTreeModal'));
import { useAnimals } from "@/hooks/animal/useAnimals";
import { useAnimalTreeApi, graphToAncestorLevels } from "@/hooks/animal/useAnimalTreeApi";
import type { AnimalTreeSummary, AnimalTreeEdgeExamples } from "@/types/animalTreeTypes";

interface StatisticsCardProps {
    title: string
    description: string
    value: number
    color?: string
    showGeneticTree?: boolean
}

const StatisticsCard = ({title, value, description, color, showGeneticTree = false}: StatisticsCardProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { animals } = useAnimals();
    const { fetchAncestors, loadMore, graph, loading } = useAnimalTreeApi();
    const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
    const [treeData, setTreeData] = useState<{ animal: any | null; levels: any[]; counts?: { nodes: number; edges: number }; summary?: AnimalTreeSummary; edgeExamples?: AnimalTreeEdgeExamples } | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // ...existing code...

    // Select first animal by default if another is not passed
    const getInitialAnimalId = () => animals && animals.length > 0 ? animals[0].id ?? null : null;

    const [, setTreeLoading] = useState(false);

    return (
        <>
            <Card 
                className={`w-full max-w-full sm:max-w-sm h-36 sm:h-40 md:h-44 lg:h-48 ${color || 'bg-slate-900'} ${showGeneticTree ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`} 
                onClick={async () => {
                    if (showGeneticTree) {
                        const id = getInitialAnimalId();
                        if (!id) return;
                                                // TEMP: log the raw animal chosen from the cached list
                                                const raw = animals.find(a => a.id === id);
                                                try {
                                                    console.debug('[geneticTree][card] initial animal object:', JSON.parse(JSON.stringify(raw)));
                                                } catch (e) {
                                                    console.debug('[geneticTree][card] initial animal object (raw):', raw);
                                                }
                                                setTreeLoading(true);
                        const resp = await fetchAncestors(id, 3, 'id,record,sex');
                        setTreeLoading(false);
                        if (!resp) return;
                        setSelectedAnimalId(id);
                        setTreeData({
                            animal: resp.nodes?.[resp.rootId] ?? null,
                            levels: graphToAncestorLevels(resp),
                            counts: resp.counts,
                            summary: resp.summary,
                            edgeExamples: resp.edge_examples,
                        });
                        setIsModalOpen(true);
                    }
                }}
            >
                <CardHeader className="flex flex-col items-start gap-1 sm:gap-1.5 p-4 sm:p-5">
                    <h2 className="text-white text-base sm:text-lg font-semibold leading-tight">
                        {title}
                    </h2>
                    <p className="text-gray-300 text-[11px] sm:text-xs leading-snug text-justify">
                        {description}
                    </p>
                </CardHeader>
                <CardBody className="flex flex-row justify-between items-center px-4 sm:px-5 py-2 sm:py-3">
                    <p className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">
                        {value}
                    </p>
                </CardBody>
            </Card>

            {showGeneticTree && selectedAnimalId !== null && treeData && (
                <Suspense fallback={<div className="flex justify-center items-center p-4"><span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span> Cargando árbol genético...</div>}>
                    <GeneticTreeModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setTreeData(null);
                            setSelectedAnimalId(null);
                        }}
                        animal={treeData.animal}
                        levels={treeData.levels}
                        counts={treeData.counts}
                        summary={treeData.summary}
                        edgeExamples={treeData.edgeExamples}
                        loadingMore={loading || loadingMore}
                        onLoadMore={async () => {
                            if (!graph || !selectedAnimalId || !treeData?.levels) return;
                            setLoadingMore(true);
                            const next = await loadMore('ancestors', selectedAnimalId, graph, { increment: 2, fields: 'id,record,sex' });
                            setLoadingMore(false);
                            if (next) {
                                setTreeData({
                                    animal: next.nodes?.[next.rootId] ?? treeData.animal,
                                    levels: graphToAncestorLevels(next),
                                    counts: next.counts,
                                    summary: next.summary,
                                    edgeExamples: next.edge_examples,
                                });
                            }
                        }}
                    />
                </Suspense>
            )}
        </>
    );
};

export default StatisticsCard;