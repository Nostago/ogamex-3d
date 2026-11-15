<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('autonomous_bots', function (Blueprint $table) {
            $table->boolean('auto_build')->default(true);
            $table->boolean('auto_research')->default(true);
            $table->boolean('auto_shipbuilding')->default(true);
            $table->boolean('auto_raid')->default(false);
            $table->boolean('auto_fleet_save')->default(true);
            $table->boolean('raid_inactive_players')->default(false);
            $table->unsignedBigInteger('fleet_save_mission_id')->nullable();
            $table->unsignedBigInteger('fleet_save_until')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('autonomous_bots', function (Blueprint $table) {
            $table->dropColumn(['auto_build', 'auto_research', 'auto_shipbuilding', 'auto_raid', 'auto_fleet_save', 'raid_inactive_players', 'fleet_save_mission_id', 'fleet_save_until']);
        });
    }
};
