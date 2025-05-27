// src/PokemonCard.tsx
import React from "react";

interface PokemonDetailProps {
  pokemon: {
    name: string; // Nombre de la forma (ej. "raichu-alola")
    id: number;
    sprites: {
      front_default: string;
      other?: {
        "official-artwork": {
          front_default: string;
        };
      };
    };
    types: {
      slot: number;
      type: {
        name: string;
        url: string;
      };
    }[];
    weaknesses: string[];
    pokemon_name?: string; // Nombre base (ej. "raichu")
    form_name?: string;    // Nombre de la forma (ej. "alola")
  };
}

const getTypeColorClass = (type: string) => {
  switch (type) {
    case "normal":
      return "bg-gray-400 text-gray-900";
    case "fire":
      return "bg-red-500 text-white";
    case "water":
      return "bg-blue-500 text-white";
    case "grass":
      return "bg-green-500 text-white";
    case "electric":
      return "bg-yellow-400 text-gray-900";
    case "ice":
      return "bg-blue-200 text-blue-800";
    case "fighting":
      return "bg-orange-700 text-white";
    case "poison":
      return "bg-purple-500 text-white";
    case "ground":
      return "bg-yellow-700 text-white";
    case "flying":
      return "bg-indigo-400 text-white";
    case "psychic":
      return "bg-pink-500 text-white";
    case "bug":
      return "bg-lime-500 text-white";
    case "rock":
      return "bg-stone-500 text-white";
    case "ghost":
      return "bg-violet-700 text-white";
    case "dragon":
      return "bg-indigo-700 text-white";
    case "steel":
      return "bg-gray-600 text-white";
    case "fairy":
      return "bg-pink-300 text-white";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

const PokemonCard: React.FC<PokemonDetailProps> = ({ pokemon }) => {
  // Determina el nombre a mostrar en la tarjeta
  const displayName = pokemon.form_name && pokemon.form_name !== 'default'
    ? `${pokemon.pokemon_name} (${pokemon.form_name})`
    : pokemon.name;

  // Usa la imagen de "official-artwork" si está disponible, si no, usa la default
  const imageUrl = pokemon.sprites.other?.["official-artwork"]?.front_default 
                   || pokemon.sprites.front_default;

  return (
    <div className="bg-white p-4 rounded shadow-md border border-gray-200">
      <h2 className="capitalize text-xl font-bold text-center mb-2">
        {displayName}
      </h2>
      <img
        src={imageUrl}
        alt={displayName}
        className="w-32 h-32 mx-auto mb-4"
      />
      <div className="mb-2">
        <h3 className="font-semibold text-gray-700">Tipos:</h3>
        <div className="flex flex-wrap gap-1">
          {pokemon.types.map((typeInfo) => (
            <span
              key={typeInfo.type.name}
              className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColorClass(
                typeInfo.type.name
              )}`}
            >
              {typeInfo.type.name}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-gray-700">Debilidades:</h3>
        <div className="flex flex-wrap gap-1">
          {pokemon.weaknesses.length > 0 ? (
            pokemon.weaknesses.map((weakness) => (
              <span
                key={weakness}
                className={`px-2 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800`}
              >
                {weakness}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-xs">No data available</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;