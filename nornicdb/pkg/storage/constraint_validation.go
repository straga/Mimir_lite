// Package storage - Constraint validation when constraints are created.
package storage

import (
	"fmt"
)

// ValidateConstraintOnCreation validates that all existing data satisfies the constraint.
// This is called when CREATE CONSTRAINT is executed, matching Neo4j behavior.
func (b *BadgerEngine) ValidateConstraintOnCreation(c Constraint) error {
	switch c.Type {
	case ConstraintUnique:
		return b.validateUniqueConstraintOnCreation(c)
	case ConstraintNodeKey:
		return b.validateNodeKeyConstraintOnCreation(c)
	case ConstraintExists:
		return b.validateExistenceConstraintOnCreation(c)
	default:
		return fmt.Errorf("unknown constraint type: %s", c.Type)
	}
}

// validateUniqueConstraintOnCreation checks all existing nodes for duplicates.
func (b *BadgerEngine) validateUniqueConstraintOnCreation(c Constraint) error {
	if len(c.Properties) != 1 {
		return fmt.Errorf("UNIQUE constraint requires exactly 1 property, got %d", len(c.Properties))
	}

	property := c.Properties[0]
	seen := make(map[interface{}]NodeID)

	// Scan all nodes with this label
	nodes, err := b.GetNodesByLabel(c.Label)
	if err != nil {
		return fmt.Errorf("scanning nodes: %w", err)
	}

	for _, node := range nodes {
		value := node.Properties[property]
		if value == nil {
			continue // NULL values don't violate uniqueness
		}

		if existingNodeID, found := seen[value]; found {
			return &ConstraintViolationError{
				Type:       ConstraintUnique,
				Label:      c.Label,
				Properties: []string{property},
				Message: fmt.Sprintf("Cannot create UNIQUE constraint: nodes %s and %s both have %s=%v",
					existingNodeID, node.ID, property, value),
			}
		}

		seen[value] = node.ID
	}

	return nil
}

// validateNodeKeyConstraintOnCreation checks all existing nodes for duplicate composite keys.
func (b *BadgerEngine) validateNodeKeyConstraintOnCreation(c Constraint) error {
	if len(c.Properties) < 1 {
		return fmt.Errorf("NODE KEY constraint requires at least 1 property")
	}

	seen := make(map[string]NodeID) // composite key -> nodeID

	nodes, err := b.GetNodesByLabel(c.Label)
	if err != nil {
		return fmt.Errorf("scanning nodes: %w", err)
	}

	for _, node := range nodes {
		// Extract all property values
		values := make([]interface{}, len(c.Properties))
		hasAllValues := true
		
		for i, prop := range c.Properties {
			val := node.Properties[prop]
			if val == nil {
				return &ConstraintViolationError{
					Type:       ConstraintNodeKey,
					Label:      c.Label,
					Properties: c.Properties,
					Message: fmt.Sprintf("Cannot create NODE KEY constraint: node %s has null value for property %s",
						node.ID, prop),
				}
			}
			values[i] = val
		}

		if !hasAllValues {
			continue
		}

		// Create composite key string
		compositeKey := fmt.Sprintf("%v", values)

		if existingNodeID, found := seen[compositeKey]; found {
			return &ConstraintViolationError{
				Type:       ConstraintNodeKey,
				Label:      c.Label,
				Properties: c.Properties,
				Message: fmt.Sprintf("Cannot create NODE KEY constraint: nodes %s and %s both have composite key %v=%v",
					existingNodeID, node.ID, c.Properties, values),
			}
		}

		seen[compositeKey] = node.ID
	}

	return nil
}

// validateExistenceConstraintOnCreation checks all existing nodes have the required property.
func (b *BadgerEngine) validateExistenceConstraintOnCreation(c Constraint) error {
	if len(c.Properties) != 1 {
		return fmt.Errorf("EXISTS constraint requires exactly 1 property, got %d", len(c.Properties))
	}

	property := c.Properties[0]

	nodes, err := b.GetNodesByLabel(c.Label)
	if err != nil {
		return fmt.Errorf("scanning nodes: %w", err)
	}

	for _, node := range nodes {
		value := node.Properties[property]
		if value == nil {
			return &ConstraintViolationError{
				Type:       ConstraintExists,
				Label:      c.Label,
				Properties: []string{property},
				Message: fmt.Sprintf("Cannot create EXISTS constraint: node %s is missing required property %s",
					node.ID, property),
			}
		}
	}

	return nil
}

// RelationshipConstraint represents a constraint on relationship properties.
type RelationshipConstraint struct {
	Name       string
	Type       ConstraintType
	RelType    string   // Relationship type (e.g., "KNOWS", "FOLLOWS")
	Properties []string
}

// ValidateRelationshipConstraint validates relationship property constraints.
func (b *BadgerEngine) ValidateRelationshipConstraint(rc RelationshipConstraint) error {
	switch rc.Type {
	case ConstraintUnique:
		return b.validateUniqueRelationshipConstraint(rc)
	case ConstraintExists:
		return b.validateExistenceRelationshipConstraint(rc)
	default:
		return fmt.Errorf("unsupported relationship constraint type: %s", rc.Type)
	}
}

// validateUniqueRelationshipConstraint checks relationship property uniqueness.
func (b *BadgerEngine) validateUniqueRelationshipConstraint(rc RelationshipConstraint) error {
	if len(rc.Properties) != 1 {
		return fmt.Errorf("UNIQUE constraint on relationships requires exactly 1 property")
	}

	property := rc.Properties[0]
	seen := make(map[interface{}]EdgeID)

	// Scan all relationships of this type
	edges, err := b.AllEdges()
	if err != nil {
		return fmt.Errorf("scanning edges: %w", err)
	}

	for _, edge := range edges {
		if edge.Type != rc.RelType {
			continue
		}

		value := edge.Properties[property]
		if value == nil {
			continue
		}

		if existingEdgeID, found := seen[value]; found {
			return &ConstraintViolationError{
				Type:       ConstraintUnique,
				Label:      rc.RelType,
				Properties: []string{property},
				Message: fmt.Sprintf("Cannot create UNIQUE constraint on relationship: edges %s and %s both have %s=%v",
					existingEdgeID, edge.ID, property, value),
			}
		}

		seen[value] = edge.ID
	}

	return nil
}

// validateExistenceRelationshipConstraint checks required relationship properties.
func (b *BadgerEngine) validateExistenceRelationshipConstraint(rc RelationshipConstraint) error {
	if len(rc.Properties) != 1 {
		return fmt.Errorf("EXISTS constraint on relationships requires exactly 1 property")
	}

	property := rc.Properties[0]

	edges, err := b.AllEdges()
	if err != nil {
		return fmt.Errorf("scanning edges: %w", err)
	}

	for _, edge := range edges {
		if edge.Type != rc.RelType {
			continue
		}

		value := edge.Properties[property]
		if value == nil {
			return &ConstraintViolationError{
				Type:       ConstraintExists,
				Label:      rc.RelType,
				Properties: []string{property},
				Message: fmt.Sprintf("Cannot create EXISTS constraint on relationship: edge %s is missing required property %s",
					edge.ID, property),
			}
		}
	}

	return nil
}

// PropertyTypeConstraint represents a type constraint on properties.
type PropertyTypeConstraint struct {
	Label      string
	Property   string
	ExpectedType PropertyType
}

// PropertyType represents the expected type of a property.
type PropertyType string

const (
	PropertyTypeString  PropertyType = "STRING"
	PropertyTypeInteger PropertyType = "INTEGER"
	PropertyTypeFloat   PropertyType = "FLOAT"
	PropertyTypeBoolean PropertyType = "BOOLEAN"
	PropertyTypeDate    PropertyType = "DATE"
	PropertyTypeDateTime PropertyType = "DATETIME"
)

// ValidatePropertyType checks if a value matches the expected type.
// Handles JSON/MessagePack serialization quirks where integers become float64.
func ValidatePropertyType(value interface{}, expectedType PropertyType) error {
	if value == nil {
		return nil // NULL is valid for any type
	}

	switch expectedType {
	case PropertyTypeString:
		if _, ok := value.(string); !ok {
			return fmt.Errorf("expected STRING, got %T", value)
		}
	case PropertyTypeInteger:
		switch v := value.(type) {
		case int, int32, int64:
			return nil
		case float64:
			// JSON/MessagePack deserializes integers as float64
			// Accept if it's a whole number
			if v == float64(int64(v)) {
				return nil
			}
			return fmt.Errorf("expected INTEGER, got %T", value)
		case float32:
			// Also check float32 for whole numbers
			if v == float32(int32(v)) {
				return nil
			}
			return fmt.Errorf("expected INTEGER, got %T", value)
		default:
			return fmt.Errorf("expected INTEGER, got %T", value)
		}
	case PropertyTypeFloat:
		switch value.(type) {
		case float32, float64:
			return nil
		default:
			return fmt.Errorf("expected FLOAT, got %T", value)
		}
	case PropertyTypeBoolean:
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("expected BOOLEAN, got %T", value)
		}
	default:
		return fmt.Errorf("unknown property type: %s", expectedType)
	}

	return nil
}

// ValidatePropertyTypeConstraintOnCreation validates existing data against type constraint.
func (b *BadgerEngine) ValidatePropertyTypeConstraintOnCreation(ptc PropertyTypeConstraint) error {
	nodes, err := b.GetNodesByLabel(ptc.Label)
	if err != nil {
		return fmt.Errorf("scanning nodes: %w", err)
	}

	for _, node := range nodes {
		value := node.Properties[ptc.Property]
		if err := ValidatePropertyType(value, ptc.ExpectedType); err != nil {
			return fmt.Errorf("node %s property %s: %w", node.ID, ptc.Property, err)
		}
	}

	return nil
}
