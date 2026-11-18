<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('admin_ship_grants', function (Blueprint $table): void {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->unsignedInteger('admin_id')->nullable();
            $table->unsignedInteger('user_id')->nullable();
            $table->unsignedInteger('planet_id')->nullable();
            $table->foreign('admin_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('planet_id')->references('id')->on('planets')->nullOnDelete();
            $table->string('recipient_name');
            $table->string('world_name');
            $table->string('coordinates', 32);
            $table->unsignedTinyInteger('planet_type');
            $table->string('ship_key', 64);
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('before');
            $table->unsignedBigInteger('after');
            $table->string('reason', 500)->nullable();
            $table->timestamps();
            $table->index(['planet_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_ship_grants');
    }
};
