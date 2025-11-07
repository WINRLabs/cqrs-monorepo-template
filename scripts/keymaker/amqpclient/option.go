package amqpclient

import (
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog/log"
)

type Option func(*AmqpClient)

func WithReconnectDelay(delay time.Duration) Option {
	return func(c *AmqpClient) {
		c.reconnectDelay = delay

		if !c.IsConnected() {
			return
		}

		connection := c.GetConnection()
		if connection == nil {
			return
		}

		connCloseChan := make(chan *amqp.Error, 1)
		connection.NotifyClose(connCloseChan)

		go func() {
			for {
				select {
				case <-c.closeChan:
					log.Info().Msg("AMQP reconnect goroutine shutting down")
					return
				case err := <-connCloseChan:
					if err != nil {
						log.Info().Err(err).Msg("AMQP connection closed, reconnecting...")
					} else {
						log.Info().Msg("AMQP connection closed normally")
						return
					}

					c.mu.Lock()
					c.connected = false
					c.mu.Unlock()

					retryDelay := delay
					maxRetries := 5

					for i := range maxRetries {
						select {
						case <-c.closeChan:
							log.Info().Msg("AMQP reconnect cancelled")
							return
						case <-time.After(retryDelay):
							err := c.Connect()
							if err == nil {
								log.Info().Msg("AMQP reconnected successfully")
								newConn := c.GetConnection()
								if newConn != nil {
									connCloseChan = make(chan *amqp.Error, 1)
									newConn.NotifyClose(connCloseChan)
								}
								break
							}
							log.Error().Err(err).Int("attempt", i+1).Msg("Failed to reconnect to AMQP")
							retryDelay *= 2
						}
					}

					if !c.IsConnected() {
						log.Error().Msg("Failed to reconnect to AMQP after maximum retries")
						return
					}
				}
			}
		}()
	}
}
