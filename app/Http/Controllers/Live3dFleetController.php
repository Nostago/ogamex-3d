<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OGame\Factories\GameMissionFactory;
use OGame\Factories\PlanetServiceFactory;
use OGame\GameObjects\Models\Units\UnitCollection;
use OGame\Models\Enums\PlanetType;
use OGame\Models\Planet\Coordinate;
use OGame\Services\CharacterClassService;
use OGame\Services\FleetMissionService;
use OGame\Services\FleetUnionService;
use OGame\Services\ObjectService;
use OGame\Services\PlayerService;
use OGame\Services\SettingsService;
use OGame\ViewModels\FleetEventRowViewModel;

/** New presentation/API adapter. Original mission checks, timing and dispatch remain authoritative. */
class Live3dFleetController extends Controller
{
    public function state(Request $request, PlayerService $player, SettingsService $settings, FleetUnionService $unions, FleetMissionService $missions, PlanetServiceFactory $planets): JsonResponse
    {
        $this->bindPlanet($request, $player);
        $data = resolve(FleetController::class)->index($request, $player, $settings, $unions)->getData();
        $ships = [];
        foreach ($data['units'] as $group) {
            foreach ($group as $unit) {
                $ships[] = ['id' => $unit->object->id, 'key' => $unit->object->machine_name, 'name' => $unit->object->title, 'available' => (string)$unit->amount, 'image' => asset('img/objects/units/'.$unit->object->assets->imgSmall)];
            }
        }
        $movement = resolve(FleetController::class)->movement($player, $missions, $planets);
        $events = $movement instanceof RedirectResponse ? [] : $movement->getData()['fleet_events'];
        $owned = $missions->getActiveFleetMissionsSentByCurrentPlayer()->keyBy('id');
        $acs = $settings->allianceCombatSystemOn();
        $rows = array_map(function (FleetEventRowViewModel $event) use ($owned, $acs): array {
            $isOwn = $owned->has($event->real_mission_id ?? $event->id);
            $ships = [];
            if ($isOwn) {
                foreach ($event->fleet_units->units as $unit) {
                    $ships[] = ['name' => $unit->unitObject->title, 'amount' => (string)$unit->amount];
                }
            }
            return [
                'id' => $event->real_mission_id ?? $event->id,
                'mission' => $event->mission_type, 'label' => $event->mission_label,
                'own' => $isOwn, 'returning' => $event->is_return_trip, 'holding' => $event->is_at_destination,
                'remaining' => $event->remaining_time,
                'returnRemaining' => $event->has_return_trip ? $event->return_remaining_time : null,
                'arrival' => $event->timer_time,
                'origin' => $event->origin_planet_coords->asString(), 'originName' => $event->origin_planet_name,
                'destination' => $event->destination_planet_coords->asString(), 'destinationName' => $event->destination_planet_name,
                'ships' => $ships, 'count' => (string)$event->fleet_unit_count,
                'recallable' => $isOwn && $event->is_recallable && !$event->is_return_trip && (!$event->is_at_destination || $event->mission_type === 5),
                'canFederation' => $acs && $isOwn && $event->can_create_federation && !$event->is_at_destination,
                'union' => $event->union_id,
            ];
        }, $events);
        return response()->json([
            'ships' => $ships, 'movements' => $rows,
            'slots' => ['used' => $data['fleetSlotsInUse'], 'max' => $data['fleetSlotsMax']],
            'expeditions' => ['used' => $data['expeditionSlotsInUse'], 'max' => $data['expeditionSlotsMax']],
            'tacticalRetreat' => [
                'ratio' => $data['tacticalRetreatRatio'],
                'deuterium' => $data['tacticalRetreatDeuteriumCost'], 'admiral' => $player->hasAdmiral(),
            ],
            'speedIncrement' => $data['fleetSpeedIncrement'] / 10,
            'unions' => $data['availableUnions'], 'maxGalaxies' => $settings->numberOfGalaxies(),
            'maxHolding' => max(1, $player->getResearchLevel('astrophysics')),
            'templates' => resolve(FleetController::class)->getTemplates($player)->getData(true)['templates'],
        ])->header('Cache-Control', 'private, no-store');
    }

    public function preview(Request $request, PlayerService $player, SettingsService $settings, FleetMissionService $missions, CharacterClassService $classes): JsonResponse
    {
        $this->checkToken($request);
        $this->prepare($request, $player, $settings, $classes);
        $data = app()->call([resolve(FleetController::class), 'dispatchCheckTarget'])->getData(true);
        $units = $this->selectedUnits($request);
        $target = new Coordinate((int)$request->input('galaxy'), (int)$request->input('system'), (int)$request->input('position'));
        $planet = $player->planets->current();
        $mission = GameMissionFactory::getMissionById((int)$request->input('mission'), []);
        $status = $mission->isMissionPossible($planet, $target, PlanetType::from((int)$request->input('type')), $units);
        if (!$status->possible && $status->error !== '') {
            $data['errors'] = [['message' => $status->error]];
        }
        $data['duration'] = $missions->calculateFleetMissionDuration($planet, $target, $units, $mission, (float)$request->input('speed'));
        $data['consumption'] = (int)ceil($missions->calculateConsumption($planet, $units, $target, (int)$request->input('holdingtime'), (float)$request->input('speed')));
        $data['capacity'] = $units->getTotalCargoCapacity($player);
        $data['fuelCapacity'] = $units->getTotalFuelCapacity($player);
        return response()->json($data)->header('Cache-Control', 'private, no-store');
    }

    public function send(Request $request, PlayerService $player, SettingsService $settings, CharacterClassService $classes): JsonResponse
    {
        $this->checkToken($request);
        $this->prepare($request, $player, $settings, $classes);
        return app()->call([resolve(FleetController::class), 'dispatchSendFleet']);
    }

    public function recall(Request $request, PlayerService $player): JsonResponse
    {
        $this->checkToken($request);
        $data = $request->validate(['fleet_mission_id' => ['required', 'integer', 'min:1']]);
        $request->replace(['fleet_mission_id' => $data['fleet_mission_id']]);
        return app()->call([resolve(FleetController::class), 'dispatchRecallFleet']);
    }

    private function bindPlanet(Request $request, PlayerService $player): void
    {
        $data = $request->validate(['planet' => ['required', 'integer', 'min:1']]);
        abort_unless($player->planets->planetExistsAndOwnedByPlayer((int)$data['planet']), 404);
        $player->setCurrentPlanetId((int)$data['planet']);
        $player->planets->current()->update();
    }

    private function prepare(Request $request, PlayerService $player, SettingsService $settings, CharacterClassService $classes): void
    {
        $this->bindPlanet($request, $player);
        $data = $request->validate([
            'galaxy' => ['required', 'integer', 'min:1', 'max:'.$settings->numberOfGalaxies()],
            'system' => ['required', 'integer', 'between:1,499'], 'position' => ['required', 'integer', 'between:1,16'],
            'type' => ['required', Rule::in([1, 2, 3])], 'mission' => ['required', Rule::in([1, 2, 3, 4, 5, 6, 7, 8, 9, 15])],
            'speed' => ['required', 'numeric', 'min:'.($classes->hasDetailedFleetSpeedSettings($player->getUser()) ? '0.5' : '1'), 'max:10', 'multiple_of:0.5'],
            'holdingtime' => ['required', 'integer', 'min:0', 'max:100000'], 'union' => ['nullable', 'integer', 'min:0'],
            'metal' => ['required', 'integer', 'min:0'], 'crystal' => ['required', 'integer', 'min:0'], 'deuterium' => ['required', 'integer', 'min:0'],
            'retreatAfterDefenderRetreat' => ['nullable', 'boolean'],
        ]);
        $planet = $player->planets->current();
        $shipData = [];
        foreach (ObjectService::getShipObjects() as $ship) {
            if (in_array($ship->machine_name, ['solar_satellite', 'crawler'], true)) {
                continue;
            }
            $key = 'am'.$ship->id;
            $amount = $request->validate([$key => ['nullable', 'integer', 'min:0', 'max:'.$planet->getObjectAmount($ship->machine_name)]]);
            if ((int)($amount[$key] ?? 0) > 0) {
                $shipData[$key] = (int)$amount[$key];
            }
        }
        abort_if($shipData === [], 422, __('t_operations.choose_ships'));
        $request->replace([...$data, ...$shipData]);
    }

    private function selectedUnits(Request $request): UnitCollection
    {
        $units = new UnitCollection();
        foreach (ObjectService::getShipObjects() as $ship) {
            $amount = (int)$request->input('am'.$ship->id, 0);
            if ($amount > 0) {
                $units->addUnit($ship, $amount);
            }
        }
        return $units;
    }

    private function checkToken(Request $request): void
    {
        $token = $request->input('_token');
        abort_unless(is_string($token) && hash_equals($request->session()->token(), $token), 419);
    }
}
