// src/App.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import PokemonCard from "./pokemonCard";

interface Pokemon {
  name: string;
  url: string;
}

interface PokemonDetail {
  name: string;
  id: number;
  sprites: {
    front_default: string;
  };
  types: {
    slot: number;
    type: {
        name: string;
        url: string;
    };
  }[];
  weaknesses: string[];
}

// Límite total de Pokémon que la aplicación puede buscar
const POKEMON_TOTAL_LIMIT = 10000;
// Límite de Pokémon que se cargan y muestran inicialmente en la página principal
const POKEMON_DISPLAY_LIMIT = 300; 

function App() {
  const [allPokemonUrls, setAllPokemonUrls] = useState<Pokemon[]>([]); // Almacena TODAS las URLs (hasta 1000)
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetail[]>([]); // Almacena solo los detalles de los Pokémon actualmente *mostrados*
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener los detalles de un Pokémon por su URL
  const fetchPokemonDetail = useCallback(async (url: string): Promise<PokemonDetail | null> => {
    try {
      const detailRes = await fetch(url);
      if (!detailRes.ok) {
        console.warn(`DEBUG: No se pudieron obtener detalles de la URL ${url}. Estado: ${detailRes.status}`);
        return null;
      }
      const detailData = await detailRes.json();

      const weaknesses: string[] = [];
      for (const typeInfo of detailData.types) {
        const typeUrl = typeInfo.type.url;
        const typeRes = await fetch(typeUrl);
        if (!typeRes.ok) {
          console.warn(`DEBUG: No se pudieron obtener detalles de tipo para ${typeInfo.type.name}. Estado: ${typeRes.status}`);
          continue;
        }
        const typeData = await typeRes.json();
        const damageRelations = typeData.damage_relations.double_damage_from;
        damageRelations.forEach((relation: { name: string }) => {
          if (!weaknesses.includes(relation.name)) {
            weaknesses.push(relation.name);
          }
        });
      }

      return {
        name: detailData.name,
        id: detailData.id,
        sprites: detailData.sprites,
        types: detailData.types,
        weaknesses: weaknesses,
      };
    } catch (e: any) {
      console.error(`DEBUG: Error al obtener detalles de ${url}:`, e);
      return null;
    }
  }, []);

  // Función para cargar los primeros 300 Pokémon
  const fetchInitialDisplayData = useCallback(async () => {
    console.log("DEBUG: fetchInitialDisplayData - Inicio de carga inicial de 300 Pokémon.");
    setLoading(true);
    setError(null);
  
    if (allPokemonUrls.length === 0) {
      console.log("DEBUG: allPokemonUrls aún no cargadas. Esperando...");
      // Esto se manejará en el useEffect que carga allPokemonUrls primero.
      setLoading(false); // Resetea loading para que el mensaje "Cargando URLs" se muestre primero
      return; 
    }

    // Filtra las URLs para cargar solo las iniciales
    const initialBatchUrls = allPokemonUrls.slice(0, POKEMON_DISPLAY_LIMIT);
    
    try {
      const detailPromises = initialBatchUrls.map(urlInfo => fetchPokemonDetail(urlInfo.url));
      const loadedDetails = (await Promise.all(detailPromises)).filter(p => p !== null) as PokemonDetail[];
      setPokemonDetails(loadedDetails);
      console.log(`DEBUG: fetchInitialDisplayData - Se cargaron ${loadedDetails.length} Pokémon iniciales.`);
    } catch (e: any) {
      console.error("DEBUG: fetchInitialDisplayData - Error al cargar Pokémon iniciales:", e);
      setError("Error al cargar los Pokémon iniciales.");
    } finally {
      setLoading(false);
      console.log("DEBUG: fetchInitialDisplayData - Finalizado.");
    }
  }, [allPokemonUrls, fetchPokemonDetail]); // Depende de allPokemonUrls y fetchPokemonDetail

  // useEffect para cargar TODAS las URLs de Pokémon al inicio
  useEffect(() => {
    const fetchAllUrls = async () => {
      console.log("DEBUG: fetchAllUrls - Cargando todas las URLs de la API...");
      try {
        // Carga la lista completa de URLs hasta el límite de 1000
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${POKEMON_TOTAL_LIMIT}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAllPokemonUrls(data.results);
        console.log(`DEBUG: fetchAllUrls - Se cargaron ${data.results.length} URLs de Pokémon.`);
        // Una vez que las URLs están cargadas, podemos disparar la carga de los primeros 300
        // (Esto se hace en un useEffect separado para secuenciar mejor)
      } catch (e: any) {
        console.error("DEBUG: fetchAllUrls - Error al cargar las URLs principales:", e);
        setError("Error al obtener la lista completa de Pokémon.");
        setLoading(false); // Si falla la carga de URLs, parar la carga
      }
    };

    if (allPokemonUrls.length === 0 && !error) { // Solo cargar si no se han cargado y no hay errores
      fetchAllUrls();
    }
  }, [allPokemonUrls.length, error]);


  // useEffect para disparar la carga inicial de los 300 Pokémon después de que allPokemonUrls estén cargadas
  useEffect(() => {
    if (allPokemonUrls.length > 0 && pokemonDetails.length === 0 && loading) { // Solo si allPokemonUrls están, pokemonDetails están vacíos, y estamos "cargando" (de fetchAllUrls)
      fetchInitialDisplayData();
    } else if (allPokemonUrls.length > 0 && pokemonDetails.length > 0 && loading) {
      setLoading(false); // Si ya tenemos detalles y seguimos en loading, es porque ya terminamos la carga inicial
    }
  }, [allPokemonUrls.length, pokemonDetails.length, loading, fetchInitialDisplayData]);


  const handleSearchChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toLowerCase();
    setSearchTerm(value);
    console.log(`DEBUG: handleSearchChange - Término de búsqueda: "${value}"`);

    if (value === '') {
      // Si el término de búsqueda está vacío, volvemos a mostrar los 300 iniciales
      console.log("DEBUG: Término de búsqueda vacío. Volviendo a la vista inicial.");
      setLoading(true); // Poner en loading mientras se re-carga la vista inicial
      fetchInitialDisplayData();
      return;
    }

    // Filtramos los Pokémon ya cargados en pokemonDetails
    const filteredInDisplay = pokemonDetails.filter(p => p.name.includes(value));

    // Si ya tenemos el Pokémon en los detalles cargados, simplemente lo mostramos
    if (filteredInDisplay.length > 0) {
      console.log("DEBUG: Pokémon encontrado en los detalles ya cargados.");
      // No necesitamos hacer nada especial aquí, filteredPokemon en el render se encargará
    } else {
      // Si el Pokémon no está en los detalles cargados, buscamos en la lista completa de URLs
      console.log("DEBUG: Pokémon no encontrado en detalles cargados. Buscando en allPokemonUrls...");
      setLoading(true);
      const foundPokemonUrl = allPokemonUrls.find(p => p.name.includes(value));

      if (foundPokemonUrl) {
        console.log(`DEBUG: Encontrado ${foundPokemonUrl.name} en allPokemonUrls. Obteniendo detalles...`);
        const detail = await fetchPokemonDetail(foundPokemonUrl.url);
        if (detail) {
          // Si encontramos el Pokémon y obtenemos sus detalles, reemplazamos la lista con este Pokémon
          // O, si queremos que se quede con los demás, podemos añadirlo y filtrar.
          // Para esta funcionalidad, lo más simple es mostrar SOLO el encontrado.
          setPokemonDetails([detail]); 
          console.log(`DEBUG: Mostrando ${detail.name}.`);
        } else {
          console.log("DEBUG: No se pudieron obtener detalles del Pokémon buscado.");
          setPokemonDetails([]); // Si no se encuentra o hay error, no mostrar nada
        }
      } else {
        console.log("DEBUG: Pokémon no encontrado en la lista completa de URLs.");
        setPokemonDetails([]); // Si no se encuentra ni en URLs completas, no mostrar nada
      }
      setLoading(false);
    }
  }, [pokemonDetails, allPokemonUrls, fetchPokemonDetail, fetchInitialDisplayData]); // Dependencias para useCallback

  // El filteredPokemon ahora solo aplica la búsqueda a los 'pokemonDetails' actuales.
  // Cuando buscas algo que no está en los 300, 'pokemonDetails' se actualiza para contener solo el resultado.
  const filteredPokemon = useMemo(() => {
    if (!searchTerm) {
      // Si no hay término de búsqueda, devolvemos los pokemonDetails tal cual (los 300 iniciales)
      return pokemonDetails;
    }
    // Si hay un término de búsqueda, filtramos sobre lo que está actualmente en pokemonDetails.
    // Si se buscó un Pokémon no visible, pokemonDetails ya habrá sido actualizado para contener solo ese.
    return pokemonDetails.filter((pokemon) =>
      pokemon.name.toLowerCase().includes(searchTerm)
    );
  }, [pokemonDetails, searchTerm]);


  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-5xl text-red-600 font-extrabold text-center mb-6">
        Pokédex
      </h1>

      <div className="mb-8 flex justify-center">
        <input
          type="text"
          placeholder="Buscar Pokémon por nombre..."
          className="p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-full max-w-md text-lg"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {error && (
        <div className="flex items-center justify-center min-h-[100px] text-xl text-red-600">
          Error al cargar los Pokémon: {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-gray-700 text-xl py-8">
          {allPokemonUrls.length === 0 ? "Cargando lista completa de Pokémon..." : "Cargando Pokémon para mostrar..."}
        </p>
      )}

      {!loading && filteredPokemon.length === 0 && searchTerm !== "" ? (
        <p className="text-center text-gray-600 text-xl py-8">
          No se encontraron Pokémon con ese nombre.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {!loading && filteredPokemon.map((pokemon) => (
            <PokemonCard
              key={pokemon.id}
              pokemon={pokemon}
            />
          ))}
        </div>
      )}

      {/* Mensajes adicionales */}
      {!loading && searchTerm === '' && pokemonDetails.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          Mostrando los primeros {pokemonDetails.length} Pokémon. Escribe para buscar más allá.
        </div>
      )}
      {!loading && searchTerm !== '' && filteredPokemon.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay resultados para tu búsqueda.
        </div>
      )}
      {!loading && searchTerm !== '' && filteredPokemon.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          Resultados de tu búsqueda.
        </div>
      )}
    </div>
  );
}

export default App;