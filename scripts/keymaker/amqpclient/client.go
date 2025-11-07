package amqpclient

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

type AmqpClient struct {
	addr           string
	reconnectDelay time.Duration
	connection     *amqp.Connection

	connected bool
	mu        sync.RWMutex
	closeChan chan struct{}
}

func NewAmqpClient(addr string, opts ...Option) (*AmqpClient, error) {
	client := &AmqpClient{
		addr:      addr,
		closeChan: make(chan struct{}),
	}

	err := client.Connect()
	if err != nil {
		return nil, err
	}

	for _, opt := range opts {
		opt(client)
	}

	return client, nil
}

func (c *AmqpClient) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.connected {
		return nil
	}

	if c.connection != nil && !c.connection.IsClosed() {
		c.connection.Close()
	}

	conn, err := amqp.Dial(c.addr)
	if err != nil {
		return err
	}

	c.connection = conn
	c.connected = true

	return nil
}

func (c *AmqpClient) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.connected
}

func (c *AmqpClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.connected {
		return nil
	}

	close(c.closeChan)

	c.connected = false

	if c.connection != nil {
		return c.connection.Close()
	}

	return nil
}

func (c *AmqpClient) GetConnection() *amqp.Connection {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.connection
}

func (c *AmqpClient) Consume(name string, durable bool, args amqp.Table, callback func(delivery amqp.Delivery)) error {
	channel, err := c.connection.Channel()
	if err != nil {
		return err
	}

	defer channel.Close()

	q, err := channel.QueueDeclare(
		name,
		durable,
		false,
		false,
		false,
		args,
	)
	if err != nil {
		return err
	}

	deliveries, err := channel.Consume(
		q.Name,
		uuid.New().String(),
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return err
	}

	for delivery := range deliveries {
		callback(delivery)
	}

	return nil
}

func (c *AmqpClient) Channel(channels ...*amqp.Channel) (*amqp.Channel, error) {
	if len(channels) > 0 {
		return channels[0], nil
	}

	return c.connection.Channel()
}

func (c *AmqpClient) Publish(ctx context.Context, name string, body []byte, headers amqp.Table, channels ...*amqp.Channel) error {
	channel, err := c.Channel(channels...)
	if err != nil {
		return err
	}

	if err := channel.Confirm(false); err != nil { // todo: check if confirm is needed
		return err
	}

	defer channel.Close()

	return channel.PublishWithContext(
		ctx,
		"",
		name,
		false,
		false,
		amqp.Publishing{
			Body:    body,
			Headers: headers,
		},
	)
}
