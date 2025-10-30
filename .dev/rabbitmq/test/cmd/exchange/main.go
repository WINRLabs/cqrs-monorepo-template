package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func failOnError(err error, msg string) {
	if err != nil {
		log.Panicf("%s: %s", msg, err)
	}
}

var (
	username     = "default_user_WxzAg6yvD2Vre4ywwOf"
	password     = "1Kjy09O3XSrxtUp3DP1F7enlzqvQgqxF"
	host         = "172.21.0.6"
	port         = 5672
	vhost        = "/"
	exchangeName = "exchange1"
	queueNames   = []string{"hello", "hello1"}
	routingKey   = "say_hello"
)

func main() {
	url := fmt.Sprintf("amqp://%s:%s@%s:%d%s", username, password, host, port, vhost)
	conn, err := amqp.Dial(url)
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	err = ch.ExchangeDeclare(
		exchangeName, // name
		"direct",     // type
		true,         // durable
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	failOnError(err, "Failed to declare an exchange")

	for _, queueName := range queueNames {
		ch.QueueBind(
			queueName,    // queue name
			routingKey,   // routing key
			exchangeName, // exchange
			false,        // no-wait
			nil,          // arguments
		)
		failOnError(err, "Failed to bind a queue")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	body := bodyFrom(os.Args)

	err = ch.PublishWithContext(ctx,
		exchangeName, // exchange
		routingKey,   // routing key
		false,        // mandatory
		false,
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "text/plain",
			Body:         []byte(body),
		})
	failOnError(err, "Failed to publish a message")
	log.Printf(" [x] Sent %s", body)
}

func bodyFrom(args []string) string {
	var s string
	if (len(args) < 2) || os.Args[1] == "" {
		s = "hello"
	} else {
		s = strings.Join(args[1:], " ")
	}
	return s
}
