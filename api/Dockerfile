FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/api.jar app.jar
EXPOSE 10000
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-Dserver.port=${PORT:-10000}", "-jar", "app.jar"]
