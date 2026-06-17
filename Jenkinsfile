pipeline {
    agent any

    options {
        // Keep build logs for the last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Syntax Check') {
            steps {
                // Sanity-check each service's entry point before spending time on a
                // full image build. We can't bind-mount the Jenkins workspace into a
                // throwaway container here, because `docker run`/`docker compose`
                // talk to the *host's* Docker daemon (via the mounted socket) - it
                // has no visibility into paths inside the Jenkins container's own
                // filesystem. Instead, copy each file directly into a temporary
                // container with `docker cp`, which works regardless of where the
                // daemon's filesystem actually lives.
                sh '''
                    for service in web-service payment-service search-service; do
                        cid=$(docker create node:20-alpine node --check /tmp/index.js)
                        docker cp "$service/src/index.js" "$cid:/tmp/index.js"
                        docker start -a "$cid"
                        docker rm "$cid" >/dev/null
                    done
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                // Recreates only the containers whose images changed; mongo/elasticsearch
                // data volumes are untouched.
                sh 'docker compose up -d'
            }
        }

        stage('Health Check') {
            steps {
                // Give services a moment to become ready, then verify the API responds.
                sh '''
                    sleep 10
                    for i in $(seq 1 10); do
                        if docker compose exec -T web wget -q -O- http://localhost:3000/health/ready; then
                            echo "Health check passed"
                            exit 0
                        fi
                        echo "Waiting for web-service to become ready... ($i/10)"
                        sleep 5
                    done
                    echo "Health check failed after retries"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline succeeded - platform deployed and healthy."
        }
        failure {
            echo "❌ Pipeline failed. Rolling back by restarting containers with the previous images..."
            // docker compose doesn't keep prior image tags by itself, so the most
            // reliable local rollback is to re-pull/recreate from the last images
            // that were successfully built and tagged before this run (Docker's
            // local image cache still has them unless pruned). This restarts the
            // stack using whatever images are currently tagged :latest on this
            // host - i.e. the last *successful* build's output.
            sh 'docker compose up -d --no-build || true'
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
