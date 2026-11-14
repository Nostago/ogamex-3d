<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('player_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('item_key', 50);
            $table->unsignedBigInteger('quantity')->default(0);
            $table->unique(['user_id', 'item_key']);
            $table->timestamps();
        });
        Schema::create('officer_contracts', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('officer', 30);
            $table->timestamp('expires_at');
            $table->unique(['user_id', 'officer']);
            $table->timestamps();
        });
        Schema::create('premium_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('request_id');
            $table->string('action', 20);
            $table->string('product_key', 50);
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('price');
            $table->unsignedBigInteger('planet_id')->nullable();
            $table->unique(['user_id', 'request_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('premium_orders');
        Schema::dropIfExists('officer_contracts');
        Schema::dropIfExists('player_items');
    }
};
