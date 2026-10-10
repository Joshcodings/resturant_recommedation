import React from 'react';
import {
  Utensils,
  UtensilsCrossed,
  Coffee,
  Pizza,
  Sandwich,
  Soup,
  Fish,
  Salad,
  Cake,
  Croissant,
  Wine,
  Flame,
  type LucideProps,
} from 'lucide-react';

interface CuisineIconProps extends LucideProps {
  cuisineList?: string[];
  cuisines?: string[];
}

export function getCuisineIconComponent(cuisineList: string[] = []): React.ComponentType<LucideProps> {
  const norm = cuisineList.map(c => c.toLowerCase());

  if (norm.some(c => c.includes('pizza') || c.includes('italian'))) return Pizza;
  if (norm.some(c => c.includes('burger') || c.includes('fast food') || c.includes('american'))) return Sandwich;
  if (norm.some(c => c.includes('cafe') || c.includes('coffee') || c.includes('beverage'))) return Coffee;
  if (norm.some(c => c.includes('bakery'))) return Croissant;
  if (norm.some(c => c.includes('dessert') || c.includes('ice cream') || c.includes('mithai') || c.includes('cake'))) return Cake;
  if (norm.some(c => c.includes('bar') || c.includes('pub') || c.includes('lounge') || c.includes('wine'))) return Wine;
  if (norm.some(c => c.includes('seafood') || c.includes('fish') || c.includes('sushi') || c.includes('japanese'))) return Fish;
  if (norm.some(c => c.includes('healthy') || c.includes('salad') || c.includes('vegetarian'))) return Salad;
  if (norm.some(c => c.includes('suya') || c.includes('bbq') || c.includes('grill') || c.includes('street food'))) return Flame;
  if (norm.some(c => c.includes('chinese') || c.includes('thai') || c.includes('asian') || c.includes('soup') || c.includes('noodle'))) return Soup;
  if (norm.some(c => c.includes('indian') || c.includes('african') || c.includes('nigerian') || c.includes('biryani') || c.includes('buka'))) return UtensilsCrossed;

  return Utensils;
}

export const CuisineIcon: React.FC<CuisineIconProps> = ({ cuisineList, cuisines, ...props }) => {
  const list = cuisines || cuisineList || [];
  const IconComponent = getCuisineIconComponent(list);
  return <IconComponent {...props} />;
};

export default CuisineIcon;
