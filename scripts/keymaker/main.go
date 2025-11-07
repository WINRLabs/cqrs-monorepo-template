package main

import (
	"fmt"
	"log"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
	"gopkg.in/yaml.v3"
)

// Config represents the main configuration structure
type Config struct {
	Exchanges   []Exchange   `yaml:"exchanges"`
	RoutingKeys []RoutingKey `yaml:"routing_keys"`
	Queues      []Queue      `yaml:"queues"`
	Bindings    []Binding    `yaml:"bindings"`
}

// Exchange represents an AMQP exchange configuration
type Exchange struct {
	Name       string `yaml:"name"`
	Type       string `yaml:"type"`
	Durable    bool   `yaml:"durable"`
	AutoDelete bool   `yaml:"autoDelete"`
	Internal   bool   `yaml:"internal"`
	NoWait     bool   `yaml:"noWait"`
}

// RoutingKey represents a routing key
type RoutingKey struct {
	Name string `yaml:"name"`
}

// Queue represents an AMQP queue configuration
type Queue struct {
	Name       string                 `yaml:"name"`
	Durable    bool                   `yaml:"durable"`
	AutoDelete bool                   `yaml:"autoDelete"`
	Exclusive  bool                   `yaml:"exclusive"`
	NoWait     bool                   `yaml:"noWait"`
	Arguments  map[string]interface{} `yaml:"arguments"`
}

// Binding represents an AMQP binding configuration
type Binding struct {
	Exchange   string `yaml:"exchange"`
	RoutingKey string `yaml:"routing_key"`
	QueueName  string `yaml:"queue_name"`
}

// loadConfig reads and parses the YAML configuration file
func loadConfig(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &config, nil
}

// declareExchanges declares all exchanges defined in the configuration
func declareExchanges(ch *amqp.Channel, exchanges []Exchange) error {
	for _, exchange := range exchanges {
		log.Printf("Declaring exchange: %s (type: %s)", exchange.Name, exchange.Type)

		err := ch.ExchangeDeclare(
			exchange.Name,
			exchange.Type,
			exchange.Durable,
			exchange.AutoDelete,
			exchange.Internal,
			exchange.NoWait,
			nil, // arguments
		)
		if err != nil {
			return fmt.Errorf("failed to declare exchange %s: %w", exchange.Name, err)
		}

		log.Printf("✓ Exchange '%s' declared successfully", exchange.Name)
	}
	return nil
}

// declareQueues declares all queues defined in the configuration
func declareQueues(ch *amqp.Channel, queues []Queue) error {
	for _, queue := range queues {
		log.Printf("Declaring queue: %s", queue.Name)

		// Convert arguments to amqp.Table
		args := amqp.Table{}
		for k, v := range queue.Arguments {
			args[k] = v
		}

		_, err := ch.QueueDeclare(
			queue.Name,
			queue.Durable,
			queue.AutoDelete,
			queue.Exclusive,
			queue.NoWait,
			args,
		)
		if err != nil {
			return fmt.Errorf("failed to declare queue %s: %w", queue.Name, err)
		}

		log.Printf("✓ Queue '%s' declared successfully", queue.Name)
	}
	return nil
}

// declareBindings creates all bindings defined in the configuration
func declareBindings(ch *amqp.Channel, bindings []Binding) error {
	for _, binding := range bindings {
		log.Printf("Creating binding: exchange=%s, routing_key=%s, queue=%s",
			binding.Exchange, binding.RoutingKey, binding.QueueName)

		err := ch.QueueBind(
			binding.QueueName,
			binding.RoutingKey,
			binding.Exchange,
			false, // noWait
			nil,   // arguments
		)
		if err != nil {
			return fmt.Errorf("failed to bind queue %s to exchange %s: %w",
				binding.QueueName, binding.Exchange, err)
		}

		log.Printf("✓ Binding created successfully")
	}
	return nil
}

func main() {
	// Get configuration file path
	configFile := "config.yaml"
	if len(os.Args) > 1 {
		configFile = os.Args[1]
	}

	// Load configuration
	log.Printf("Loading configuration from: %s", configFile)
	config, err := loadConfig(configFile)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Get RabbitMQ connection string from environment variable
	amqpURL := os.Getenv("RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5672/"
	}

	// Connect to RabbitMQ
	log.Printf("Connecting to RabbitMQ...")
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	// Open a channel
	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}
	defer ch.Close()

	log.Printf("✓ Connected to RabbitMQ successfully")
	log.Println("Starting declaration process...")

	// Declare exchanges
	if len(config.Exchanges) > 0 {
		log.Println("\n=== Declaring Exchanges ===")
		if err := declareExchanges(ch, config.Exchanges); err != nil {
			log.Fatalf("Error declaring exchanges: %v", err)
		}
	}

	// Declare queues
	if len(config.Queues) > 0 {
		log.Println("\n=== Declaring Queues ===")
		if err := declareQueues(ch, config.Queues); err != nil {
			log.Fatalf("Error declaring queues: %v", err)
		}
	}

	// Create bindings
	if len(config.Bindings) > 0 {
		log.Println("\n=== Creating Bindings ===")
		if err := declareBindings(ch, config.Bindings); err != nil {
			log.Fatalf("Error creating bindings: %v", err)
		}
	}

	log.Println("\n✓ All declarations completed successfully!")
	log.Printf("Summary: %d exchange(s), %d queue(s), %d binding(s)",
		len(config.Exchanges), len(config.Queues), len(config.Bindings))
}
