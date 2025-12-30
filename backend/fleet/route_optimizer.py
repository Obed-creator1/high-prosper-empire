# backend/fleet/route_optimizer.py
import logging
import numpy as np
from math import radians, sin, cos, sqrt, atan2

logger = logging.getLogger(__name__)

# Safe OR-Tools import with fallback
try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
    ORTOOLS_AVAILABLE = True
    logger.info("OR-Tools loaded — multi-vehicle optimization enabled")
except Exception as e:
    logger.warning(f"OR-Tools unavailable: {e}")
    ORTOOLS_AVAILABLE = False


def _haversine_distance(coord1, coord2):
    """Accurate great-circle distance in meters"""
    R = 6371000  # Earth radius in meters
    lat1, lon1 = radians(coord1[0]), radians(coord1[1])
    lat2, lon2 = radians(coord2[0]), radians(coord2[1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c


def optimize_multi_vehicle_routes(depots, locations, num_vehicles=3, vehicle_capacity=None):
    """
    Multi-vehicle VRP optimization.

    Args:
        depots: list of (lat, lng) for vehicle starting points (one per vehicle)
        locations: list of dicts: {'lat': float, 'lng': float, 'demand': int, 'id': str}
        num_vehicles: number of vehicles (defaults to len(depots))
        vehicle_capacity: list of capacities per vehicle (or single int)

    Returns:
        list of routes: [{'vehicle': i, 'route': [indices], 'total_distance': float}]
    """
    if not locations:
        return []

    num_vehicles = num_vehicles or len(depots)
    all_points = depots + [(loc['lat'], loc['lng']) for loc in locations]
    num_locations = len(all_points)

    if not ORTOOLS_AVAILABLE:
        logger.info("OR-Tools disabled — using multi-vehicle fallback")
        return _multi_vehicle_fallback(depots, locations, num_vehicles)

    try:
        # Distance matrix (meters → scaled int)
        distance_matrix = np.zeros((num_locations, num_locations), dtype=int)
        for i in range(num_locations):
            for j in range(num_locations):
                if i == j:
                    continue
                distance_matrix[i][j] = int(_haversine_distance(all_points[i], all_points[j]))

        # Demand array (0 for depots)
        demands = [0] * len(depots) + [loc.get('demand', 1) for loc in locations]

        # Capacity
        if isinstance(vehicle_capacity, int):
            capacities = [vehicle_capacity] * num_vehicles
        elif vehicle_capacity is None:
            capacities = [len(locations) // num_vehicles + 5] * num_vehicles
        else:
            capacities = vehicle_capacity

        # OR-Tools setup
        manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, list(range(len(depots))))
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add capacity constraint if provided
        if any(c > 0 for c in capacities):
            def demand_callback(from_index):
                from_node = manager.IndexToNode(from_index)
                return demands[from_node]

            demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
            routing.AddDimensionWithVehicleCapacity(
                demand_callback_index,
                0,  # null slack
                capacities,
                True,  # start cumul to zero
                'Capacity'
            )

        # Search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 30
        search_parameters.log_search = True

        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            logger.warning("No solution found — falling back")
            return _multi_vehicle_fallback(depots, locations, num_vehicles)

        routes = []
        total_distance = 0

        for vehicle_id in range(num_vehicles):
            route = []
            route_distance = 0
            index = routing.Start(vehicle_id)
            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                route.append(node - len(depots) if node >= len(depots) else None)  # None = depot
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)

            total_distance += route_distance
            routes.append({
                'vehicle': vehicle_id + 1,
                'route': [i for i in route if i is not None],  # filter depot
                'distance_km': round(route_distance / 1000, 2),
                'stops': len([i for i in route if i is not None])
            })

        logger.info(f"Multi-vehicle optimization complete: {num_vehicles} vehicles, {total_distance/1000:.1f} km total")
        return routes

    except Exception as e:
        logger.error(f"Multi-vehicle optimization failed: {e}")
        return _multi_vehicle_fallback(depots, locations, num_vehicles)


def _multi_vehicle_fallback(depots, locations, num_vehicles):
    """Simple clustering fallback when OR-Tools unavailable"""
    from sklearn.cluster import KMeans

    coords = np.array([(loc['lat'], loc['lng']) for loc in locations])
    if len(coords) == 0:
        return []

    kmeans = KMeans(n_clusters=min(num_vehicles, len(locations)), random_state=42)
    kmeans.fit(coords)
    labels = kmeans.labels_

    routes = []
    for v in range(num_vehicles):
        cluster_indices = [i for i, label in enumerate(labels) if label == v]
        # Simple nearest neighbor within cluster
        cluster_route = _nearest_neighbor_route([depots[0]] + [locations[i] for i in cluster_indices])
        routes.append({
            'vehicle': v + 1,
            'route': cluster_route[1:-1],  # remove depot
            'distance_km': 0,  # not calculated
            'stops': len(cluster_route) - 2
        })

    return routes


def _nearest_neighbor_route(locations):
    """Single-vehicle fallback"""
    if len(locations) <= 1:
        return list(range(len(locations)))

    unvisited = set(range(1, len(locations)))
    route = [0]
    current = 0

    while unvisited:
        nearest = min(unvisited, key=lambda x: _haversine_distance(locations[current], locations[x]))
        route.append(nearest)
        current = nearest
        unvisited.remove(nearest)

    route.append(0)
    return route