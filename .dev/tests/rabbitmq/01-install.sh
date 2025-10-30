kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

# GET USERNAME & PASSWORD
# username="$(kubectl get secret hello-world-default-user -o jsonpath='{.data.username}' | base64 --decode)"
# password="$(kubectl get secret hello-world-default-user -o jsonpath='{.data.password}' | base64 --decode)"

# echo "Username: $username"
# echo "Password: $password"