import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Feature {
  title: string;
  icon: React.ElementType;
  description: string;
}

interface FeatureCardProps {
  feature: Feature;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => (
  <Card className="flex flex-col lg:w-[380px] w-full h-48 m-auto">
    <CardHeader>
      <CardTitle className="flex items-center text-xl">
        <feature.icon className="mr-2 h-6 w-6 text-green-600" />
        {feature.title}
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-grow text-justify">
      <p>{feature.description}</p>
    </CardContent>
  </Card>
);

export default FeatureCard;