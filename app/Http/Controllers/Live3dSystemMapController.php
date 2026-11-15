<?php

namespace OGame\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use OGame\Factories\PlanetServiceFactory;
use OGame\GameObjects\Models\Enums\GameObjectType;
use OGame\Models\EspionageReport;
use OGame\Models\Message;
use OGame\Models\Planet\Coordinate;
use OGame\Services\FleetMissionService;
use OGame\Services\ObjectService;
use OGame\Services\PlayerService;
use OGame\ViewModels\FleetEventRowViewModel;

/** Read-only map projection. Never query undisclosed foreign fleets or live foreign inventories. */
class Live3dSystemMapController extends Controller
{
    public function index(Request $request, PlayerService $player, FleetMissionService $missions, PlanetServiceFactory $planets): JsonResponse
    {
        $input = $request->validate(['planet' => ['required', 'integer', 'min:1']]);
        abort_unless($player->planets->planetExistsAndOwnedByPlayer((int)$input['planet']), 404);
        $player->setCurrentPlanetId((int)$input['planet']);
        $coordinates = $player->planets->current()->getPlanetCoordinates();
        $galaxy = $coordinates->galaxy;
        $system = $coordinates->system;
        $movement = resolve(FleetController::class)->movement($player, $missions, $planets);
        /** @var array<FleetEventRowViewModel> $events */
        $events = $movement instanceof RedirectResponse ? [] : $movement->getData()['fleet_events'];
        $visible = $missions->getActiveFleetMissionsForCurrentPlayer()->keyBy('id');
        $fleets = [];
        foreach ($events as $event) {
            $from = $event->origin_planet_coords;
            $to = $event->destination_planet_coords;
            $model = $visible->get($event->real_mission_id ?? $event->id);
            // Return missions already store their actual reversed endpoints. The legacy
            // movement view swaps these again; the radar must follow the saved flight.
            if ($event->is_return_trip && $model !== null && isset($model->galaxy_from, $model->system_from, $model->position_from, $model->galaxy_to, $model->system_to, $model->position_to)) {
                $from = new Coordinate((int)$model->galaxy_from, (int)$model->system_from, (int)$model->position_from);
                $to = new Coordinate((int)$model->galaxy_to, (int)$model->system_to, (int)$model->position_to);
            }
            if (($from->galaxy !== $galaxy || $from->system !== $system) && ($to->galaxy !== $galaxy || $to->system !== $system)) {
                continue;
            }
            $own = $model?->user_id === $player->getId();
            $fleets[] = [
                'id' => $event->real_mission_id ?? $event->id, 'mission' => $event->mission_type,
                'label' => $event->mission_label, 'own' => $own,
                'relation' => $own ? 'own' : (in_array($event->mission_type, [1, 2, 6, 9, 10], true) ? 'hostile' : 'neutral'),
                'origin' => $from->asString(), 'destination' => $to->asString(),
                'originType' => $event->is_return_trip && $model !== null ? $model->type_from : $event->origin_planet_type->value, 'destinationType' => $event->is_return_trip && $model !== null ? $model->type_to : $event->destination_planet_type->value,
                'departure' => $event->time_departure, 'arrival' => $event->timer_time,
                'holding' => $event->is_at_destination, 'returning' => $event->is_return_trip,
                // Foreign ship composition and counts are deliberately omitted.
                'count' => $own ? (string)$event->fleet_unit_count : null,
            ];
        }

        // Ownership belongs to the recipient message, NOT espionage_reports.planet_user_id.
        // Resolve at most one latest, still retained report per planet/moon position.
        $latest = EspionageReport::query()->where('planet_galaxy', $galaxy)->where('planet_system', $system)
            ->whereBetween('planet_position', [1, 15])
            ->whereIn('id', Message::query()->select('espionage_report_id')->where('user_id', $player->getId())->where('key', 'espionage_report'))
            ->selectRaw('MAX(id)')->groupBy('planet_position', 'planet_type');
        $reports = [];
        foreach (EspionageReport::query()->whereIn('id', $latest)->orderBy('planet_position')->orderBy('planet_type')->get() as $report) {
            $reports[] = $this->report($report);
        }
        return response()->json([
            'planet' => (int)$input['planet'], 'galaxy' => $galaxy, 'system' => $system,
            'serverTime' => Date::now()->timestamp, 'fleets' => $fleets, 'reports' => $reports,
        ])->header('Cache-Control', 'private, no-store');
    }

    /** @return array<string, mixed> */
    private function report(EspionageReport $report): array
    {
        $sections = [];
        $armed = false;
        $military = array_map(fn ($object): string => $object->machine_name, ObjectService::getMilitaryShipObjects());
        foreach (['resources', 'debris', 'ships', 'defense', 'buildings', 'research'] as $section) {
            $values = $report->getAttribute($section);
            if (!is_array($values)) {
                $sections[$section] = null;
                continue;
            }
            $rows = [];
            if (in_array($section, ['resources', 'debris'], true)) {
                foreach (['metal', 'crystal', 'deuterium', 'energy'] as $key) {
                    if (isset($values[$key]) && is_numeric($values[$key])) {
                        $rows[] = ['key' => $key, 'name' => __('t_live3d.'.$key), 'amount' => (string)max(0, (int)$values[$key])];
                    }
                }
            } else {
                foreach (ObjectService::getObjects() as $object) {
                    $valid = match ($section) {
                        'ships' => $object->type === GameObjectType::Ship,
                        'defense' => $object->type === GameObjectType::Defense,
                        'buildings' => in_array($object->type, [GameObjectType::Building, GameObjectType::Station], true),
                        default => $object->type === GameObjectType::Research,
                    };
                    $amount = $values[$object->machine_name] ?? null;
                    if (!$valid || !is_numeric($amount) || (int)$amount <= 0) {
                        continue;
                    }
                    $rows[] = ['key' => $object->machine_name, 'name' => $object->title, 'amount' => (string)(int)$amount];
                    if ($section === 'defense' || ($section === 'ships' && in_array($object->machine_name, $military, true))) {
                        $armed = true;
                    }
                }
            }
            $sections[$section] = $rows;
        }
        return [
            'position' => $report->planet_position, 'type' => $report->planet_type,
            'targetPlayer' => $report->planet_user_id, 'observed' => $report->created_at?->timestamp,
            'assessment' => $armed ? 'armed' : ($sections['ships'] !== null && $sections['defense'] !== null ? 'clear' : 'partial'),
            'sections' => $sections,
        ];
    }
}
