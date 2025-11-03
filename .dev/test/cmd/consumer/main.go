package main

import (
	"fmt"
	"log"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
)

func failOnError(err error, msg string) {
	if err != nil {
		log.Panicf("%s: %s", msg, err)
	}
}

var (
	username = "default_user_WxzAg6yvD2Vre4ywwOf"
	password = "1Kjy09O3XSrxtUp3DP1F7enlzqvQgqxF"
	host     = "172.21.0.6"
	port     = 5672
	vhost    = "/"
)

func main() {
	arguments := os.Args[1:]
	if len(arguments) != 1 {
		log.Fatalf("Usage: %s <queue-name>", os.Args[0])
	}

	queueName := arguments[0]

	url := fmt.Sprintf("amqp://%s:%s@%s:%d%s", username, password, host, port, vhost)
	conn, err := amqp.Dial(url)
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	q, err := ch.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		amqp.Table{
			"x-queue-type": "quorum", // Use quorum queue for high availability
		},
	)
	failOnError(err, "Failed to declare a queue")

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		true,   // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,
	)
	failOnError(err, "Failed to register a consumer")

	var forever chan struct{}

	go func() {
		for d := range msgs {
			log.Printf("Received a message: %s", d.Body)
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}
