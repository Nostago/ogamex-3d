# syntax=docker/dockerfile:1
FROM composer:2@sha256:8de2184c6de224f4689e8f80ed5f5edaf0030b6b8b7839a22a2bcb6722ac87d0 AS composer
FROM php:8.5.12-fpm
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
RUN --mount=type=secret,id=ca,required=true \
    export SSL_CERT_FILE=/run/secrets/ca CURL_CA_BUNDLE=/run/secrets/ca; \
    apt-get -o Acquire::https::CaInfo=/run/secrets/ca update && \
    apt-get -o Acquire::https::CaInfo=/run/secrets/ca install -y --no-install-recommends libonig-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libffi-dev unzip git && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install -j4 ffi pdo_mysql mbstring zip exif pcntl gd bcmath && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /var/www
RUN usermod -u 1000 www-data && groupmod -g 1000 www-data
