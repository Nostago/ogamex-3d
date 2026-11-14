<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('autonomous_bots', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id')->unique();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->boolean('enabled')->default(false);
            $table->string('profile', 20)->default('balanced');
            $table->unsignedInteger('interval_seconds')->default(120);
            $table->unsignedInteger('max_level')->default(20);
            $table->unsignedInteger('ship_limit')->default(100);
            $table->unsignedInteger('batch_size')->default(10);
            $table->unsignedBigInteger('cycles')->default(0);
            $table->timestamp('next_tick_at')->nullable()->index();
            $table->timestamp('last_tick_at')->nullable();
            $table->string('last_action', 30)->default('created');
            $table->string('last_object', 80)->nullable();
            $table->unsignedInteger('last_amount')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('autonomous_bots');
    }
};
